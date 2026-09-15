// Motor de red: dominios L2 por VLAN, tablas de ruteo (conectadas/estáticas/OSPF) y simulación de ping bidireccional
import { INTERNET, ipToInt, netOf, inSubnet, maskLen, isSwitch, isEndpoint, isWireless, hasCli } from './utils.js'
import { TOPO_ORDER } from './labGenerator.js'

export function linkOf(lab, devId, port) {
  return lab.links.find((l) => (l.a.dev === devId && l.a.port === port) || (l.b.dev === devId && l.b.port === port))
}
export function pcLinkOf(lab, devId) {
  return lab.links.find((l) => l.a.dev === devId || l.b.dev === devId)
}
export function otherSide(l, devId) { return l.a.dev === devId ? l.b : l.a }
export function ifaceNode(lab, devId, port) { return isEndpoint(lab.devices[devId]) ? devId : devId + '.' + port }

export function physUp(lab, devId, port) {
  const d = lab.devices[devId]
  if (!d) return false
  const i = d.interfaces[port]
  if (!i || i.status !== 'up') return false
  if (isSwitch(d) && i.kind === 'port' && i.security && i.security.state === 'err-disabled') return false
  if ((d.type === 'l2switch' || d.type === 'l3switch') && i.kind === 'port' && i.mode === 'access' && i.accessVlan != null && !d.vlans[i.accessVlan]) return false
  return true
}
export function portUp(lab, devId, port) {
  if (!physUp(lab, devId, port)) return false
  const lk = linkOf(lab, devId, port)
  if (!lk) return true
  const o = otherSide(lk, devId)
  const od = lab.devices[o.dev]
  if (isEndpoint(od) || !o.port) return true
  return physUp(lab, o.dev, o.port)
}
export function pcUp(lab, pcId) {
  const lk = pcLinkOf(lab, pcId)
  if (!lk) return false
  if (lk.kind === 'wifi') {
    const apSide = lk.a.dev === pcId ? lk.b : lk.a
    const ap = lab.devices[apSide.dev]
    return !!ap && ap.type === 'ap' && portUp(lab, ap.id, 'Gi0/0')
  }
  const sw = lk.a.dev === pcId ? lk.b : lk.a
  return portUp(lab, sw.dev, sw.port)
}
export function sviUp(d, name) {
  const i = d.interfaces[name]
  if (!i || i.kind !== 'svi') return false
  const v = +name.slice(4)
  return i.status === 'up' && !!d.vlans[v]
}

export function carriedVlans(lab, l) {
  const dA = lab.devices[l.a.dev], dB = lab.devices[l.b.dev]
  if (!isSwitch(dA) || !isSwitch(dB)) return []
  const ia = dA.interfaces[l.a.port], ib = dB.interfaces[l.b.port]
  if (!ia || !ib) return []
  if (ia.mode === 'trunk' && ib.mode === 'trunk') return ia.allowed.filter((v) => ib.allowed.includes(v))
  if (ia.mode === 'access' && ib.mode === 'access') return (ia.accessVlan != null && ia.accessVlan === ib.accessVlan) ? [ia.accessVlan] : []
  return []
}
export function linkBlocked(lab, l) {
  const dA = lab.devices[l.a.dev], dB = lab.devices[l.b.dev]
  return (dA.stp && dA.stp[l.a.port] === 'blocking') || (dB.stp && dB.stp[l.b.port] === 'blocking')
}

export function recompute(lab) {
  const devs = lab.devices, links = lab.links
  const ufs = {}, nodeVlans = new Map()
  function uf(n) {
    return ufs[n] || (ufs[n] = {
      p: {},
      find(x) {
        if (this.p[x] === undefined) this.p[x] = x
        let r = x
        while (this.p[r] !== r) r = this.p[r]
        while (this.p[x] !== x) { const nx = this.p[x]; this.p[x] = r; x = nx }
        return r
      },
      union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p[ra] = rb },
    })
  }
  function addNode(node, v) {
    uf(v).find(node)
    let set = nodeVlans.get(node)
    if (!set) { set = new Set(); nodeVlans.set(node, set) }
    set.add(v)
  }
  function portVlansLocal(d, port) {
    const i = d.interfaces[port]
    if (!i || i.kind !== 'port' || !physUp(lab, d.id, port)) return []
    if (i.mode === 'access') return i.accessVlan != null ? [i.accessVlan] : []
    if (i.mode === 'trunk') return (i.allowed || []).slice()
    return []
  }
  for (const d of Object.values(devs)) {
    if (!isSwitch(d)) continue
    const localByVlan = {}
    for (const [p, i] of Object.entries(d.interfaces)) {
      if (i.kind !== 'port') continue
      for (const v of portVlansLocal(d, p)) {
        addNode(d.id + '.' + p, v)
        ;(localByVlan[v] || (localByVlan[v] = [])).push(d.id + '.' + p)
      }
    }
    for (const v of Object.keys(localByVlan)) {
      const arr = localByVlan[v]
      for (let i = 1; i < arr.length; i++) uf(+v).union(arr[0], arr[i])
    }
    for (const [name, i] of Object.entries(d.interfaces)) {
      if (i.kind !== 'svi' || !sviUp(d, name)) continue
      const v = +name.slice(4)
      addNode(d.id + '.' + name, v)
      for (const pnode of (localByVlan[v] || [])) uf(v).union(d.id + '.' + name, pnode)
    }
  }
  for (const l of links) {
    if (l.kind !== 'eth') continue
    const dA = devs[l.a.dev], dB = devs[l.b.dev]
    const swA = isSwitch(dA), swB = isSwitch(dB)
    if (swA && swB) {
      if (!portUp(lab, l.a.dev, l.a.port) || !portUp(lab, l.b.dev, l.b.port)) continue
      if (linkBlocked(lab, l)) continue
      for (const v of carriedVlans(lab, l)) {
        addNode(l.a.dev + '.' + l.a.port, v)
        addNode(l.b.dev + '.' + l.b.port, v)
        uf(v).union(l.a.dev + '.' + l.a.port, l.b.dev + '.' + l.b.port)
      }
    } else {
      const swSide = swA ? l.a : l.b, epSide = swA ? l.b : l.a
      if (!swSide.port) continue
      const swD = devs[swSide.dev], i = swD.interfaces[swSide.port]
      if (!i || i.mode !== 'access' || i.accessVlan == null) continue
      if (!portUp(lab, swSide.dev, swSide.port)) continue
      if (!isEndpoint(devs[epSide.dev]) && !epSide.port) continue
      if (!isEndpoint(devs[epSide.dev]) && !portUp(lab, epSide.dev, epSide.port)) continue
      const v = i.accessVlan
      const epNode = ifaceNode(lab, epSide.dev, epSide.port)
      addNode(epNode, v)
      addNode(swSide.dev + '.' + swSide.port, v)
      uf(v).union(epNode, swSide.dev + '.' + swSide.port)
    }
  }
  for (const l of links) {
    if (l.kind !== 'wifi') continue
    const apSide = devs[l.a.dev] && devs[l.a.dev].type === 'ap' ? l.a : l.b
    const clSide = apSide === l.a ? l.b : l.a
    const ap = devs[apSide.dev], client = devs[clSide.dev]
    if (!ap || !client || !client.pc) continue
    if (!physUp(lab, ap.id, 'Gi0/0')) continue
    const ssid = (ap.ssids || []).find((s) => s.name === client.pc.ssid)
    if (!ssid || ssid.vlan == null) continue
    const v = ssid.vlan
    addNode(ap.id + '.Gi0/0', v)
    addNode(client.id, v)
    uf(v).union(client.id, ap.id + '.Gi0/0')
  }
  lab.eng = { ufs, nodeVlans }
  return lab.eng
}

export function sameL2(lab, x, y) {
  if (!lab.eng || x == null || y == null) return false
  if (x === y) return true
  const lx = lab.eng.nodeVlans.get(x)
  if (!lx) return false
  const ly = lab.eng.nodeVlans.get(y)
  if (!ly) return false
  for (const v of lx) {
    if (ly.has(v) && lab.eng.ufs[v].find(x) === lab.eng.ufs[v].find(y)) return true
  }
  return false
}

export function deliverTo(lab, dstIp, fromNode, fromDevId) {
  const devs = lab.devices
  for (const l of lab.links) {
    let me = null, other = null
    if (l.a.dev === fromDevId) { me = l.a; other = l.b } else if (l.b.dev === fromDevId) { me = l.b; other = l.a }
    if (!me || !other || !other.port) continue
    const od = devs[other.dev]
    if (isEndpoint(od)) continue
    const oi = od.interfaces[other.port]
    if (oi && oi.ip === dstIp && portUp(lab, od.id, other.port) && (!me.port || portUp(lab, fromDevId, me.port))) {
      return { dev: od, iface: other.port, node: od.id + '.' + other.port }
    }
  }
  for (const d of Object.values(devs)) {
    if (isEndpoint(d)) {
      if (d.pc && d.pc.ip === dstIp && pcUp(lab, d.id) && sameL2(lab, fromNode, d.id)) return { dev: d, iface: 'NIC', node: d.id }
      continue
    }
    for (const [name, i] of Object.entries(d.interfaces)) {
      if (!i.ip || i.ip !== dstIp) continue
      if (i.kind === 'svi') {
        if (sviUp(d, name) && sameL2(lab, fromNode, d.id + '.' + name)) return { dev: d, iface: name, node: d.id + '.' + name }
      } else if (i.kind === 'routed') {
        if (portUp(lab, d.id, name) && sameL2(lab, fromNode, d.id + '.' + name)) return { dev: d, iface: name, node: d.id + '.' + name }
      }
    }
  }
  return null
}

export function ospfNeighbors(lab, d) {
  if (!d.ospf || !d.ospf.enabled) return []
  const out = []
  for (const e of Object.values(lab.devices)) {
    if (e.id === d.id || isEndpoint(e) || !e.ospf || !e.ospf.enabled) continue
    let via = null
    for (const [n1, i1] of Object.entries(d.interfaces)) {
      if (!i1.ip || !i1.mask) continue
      const up1 = i1.kind === 'svi' ? sviUp(d, n1) : portUp(lab, d.id, n1)
      if (!up1) continue
      const node1 = d.id + '.' + n1
      for (const [n2, i2] of Object.entries(e.interfaces)) {
        if (!i2.ip || !i2.mask) continue
        const up2 = i2.kind === 'svi' ? sviUp(e, n2) : portUp(lab, e.id, n2)
        if (!up2) continue
        if (netOf(i1.ip, i1.mask) !== netOf(i2.ip, i2.mask) || i1.mask !== i2.mask) continue
        const node2 = e.id + '.' + n2
        const lk = linkOf(lab, d.id, n1)
        const direct = lk && otherSide(lk, d.id).dev === e.id && otherSide(lk, d.id).port === n2
        if (direct || sameL2(lab, node1, node2)) { via = i2.ip; break }
      }
      if (via) break
    }
    if (via) out.push({ dev: e, via })
  }
  return out
}

export function wildMatch(ip, net, wild) { return (ipToInt(ip) & ~ipToInt(wild) >>> 0) === (ipToInt(net) & ~ipToInt(wild) >>> 0) }

export function routesOf(lab, d) {
  const rt = []
  if (isEndpoint(d)) {
    if (!pcUp(lab, d.id)) return rt
    const p = d.pc
    rt.push({ type: 'connected', net: netOf(p.ip, p.mask), mask: p.mask, via: null, node: d.id, iface: 'NIC', dev: d })
    if (inSubnet(p.gw, netOf(p.ip, p.mask), p.mask)) rt.push({ type: 'static', net: '0.0.0.0', mask: '0.0.0.0', via: p.gw, node: d.id, iface: 'NIC', dev: d, default: true })
    return rt
  }
  for (const [name, i] of Object.entries(d.interfaces)) {
    if (!i.ip || !i.mask) continue
    let up = false
    if (i.kind === 'svi') up = sviUp(d, name)
    else if (i.kind === 'routed') up = portUp(lab, d.id, name)
    if (!up) continue
    rt.push({ type: 'connected', net: netOf(i.ip, i.mask), mask: i.mask, via: null, node: d.id + '.' + name, iface: name, dev: d })
  }
  for (const sr of d.staticRoutes || []) rt.push({ type: 'static', net: sr.net, mask: sr.mask, via: sr.via, node: null, iface: null, dev: d, default: sr.net === '0.0.0.0' })
  if (d.ospf && d.ospf.enabled) {
    for (const nb of ospfNeighbors(lab, d)) {
      const e = nb.dev
      for (const [name, i] of Object.entries(e.interfaces)) {
        if (!i.ip || !i.mask) continue
        let up = false
        if (i.kind === 'svi') up = sviUp(e, name)
        else if (i.kind === 'routed') up = portUp(lab, e.id, name)
        if (!up) continue
        const net = netOf(i.ip, i.mask)
        if (!e.ospf.networks.some((nw) => wildMatch(i.ip, nw.net, nw.wild) && nw.net === net)) continue
        if (rt.some((r) => r.net === net && r.mask === i.mask)) continue
        rt.push({ type: 'ospf', net, mask: i.mask, via: nb.via, node: null, iface: null, dev: d })
      }
    }
  }
  return rt
}

export function lpm(rt, dst) {
  let best = null, bestLen = -1
  for (const r of rt) {
    if (!inSubnet(dst, r.net, r.mask)) continue
    const len = maskLen(r.mask)
    if (len > bestLen) { bestLen = len; best = r }
  }
  if (best && best.via) {
    const c = rt.find((r) => r.type === 'connected' && inSubnet(best.via, r.net, r.mask))
    best = Object.assign({}, best, { node: c ? c.node : null, iface: c ? c.iface : null, viaIface: c ? c.iface : null })
  }
  return best
}

export function aclMatch(match, ip) {
  if (!match || match === 'any') return true
  if (match.startsWith('host:')) return match.slice(5) === ip
  const [net, wild] = match.split('/')
  return wildMatch(ip, net, wild)
}
export function aclEntryMatch(e, srcIp, dstIp, proto) {
  if (e.proto && e.proto !== 'ip' && e.proto !== proto) return false
  return aclMatch(e.src, srcIp) && aclMatch(e.dst, dstIp)
}
export function aclDecision(d, iface, dir, srcIp, dstIp, proto) {
  if (!iface || !d.aclApply) return null
  const applies = d.aclApply.filter((a) => a.iface === iface && a.dir === dir)
  if (!applies.length) return null
  for (const a of applies) {
    const entries = (d.acls && d.acls[a.name]) || []
    for (const e of entries) if (aclEntryMatch(e, srcIp, dstIp, proto)) return { action: e.action, name: a.name }
  }
  return { action: 'deny', name: applies[0].name }
}
export function aclAddrText(match) {
  if (!match || match === 'any') return 'any'
  if (match.startsWith('host:')) return 'host ' + match.slice(5)
  return match.split('/').join(' ')
}
export function aclAppliesOn(d, name) {
  return (d.aclApply || []).filter((a) => a.name === name).map((a) => a.iface + ' ' + a.dir)
}

export function routeFrom(lab, d, dst, trail, srcIp, inIface) {
  if (d.type === 'isp') {
    if (/^10\./.test(dst)) return { ok: false, reason: 'El paquete murió en el ISP: las subredes privadas 10.x nunca deberían salir por aquí — a R1 le falta la ruta de regreso (revisa show ip route en R1)', where: 'ISP' }
    return { ok: true, path: trail }
  }
  const src = srcIp || '0.0.0.0'
  const aclIn = aclDecision(d, inIface, 'in', src, dst, 'icmp')
  if (aclIn && aclIn.action === 'deny') return { ok: false, reason: d.name + ': la ACL ' + aclIn.name + ' (entrada ' + inIface + ') descarta el tráfico de ' + src + ' hacia ' + dst, where: d.name }
  const rt = routesOf(lab, d)
  const r = lpm(rt, dst)
  if (!r) return { ok: false, reason: d.name + ': no hay ruta hacia ' + dst + ' — revisa `show ip route`', where: d.name }
  const aclOut = aclDecision(d, r.iface, 'out', src, dst, 'icmp')
  if (aclOut && aclOut.action === 'deny') return { ok: false, reason: d.name + ': la ACL ' + aclOut.name + ' (salida ' + (r.iface || '?') + ') bloquea el tráfico hacia ' + dst, where: d.name }
  if (r.type === 'connected') {
    const t = deliverTo(lab, dst, r.node, d.id)
    if (t) return { ok: true, path: trail.concat([d.name + ' → ' + dst]), reached: t }
    return { ok: false, reason: d.name + ': ' + dst + ' no responde en la subred ' + r.net + '/' + maskLen(r.mask) + ' (host caído, VLAN incorrecta, trunk roto o IP fuera de subred)', where: d.name }
  }
  const g = deliverTo(lab, r.via, r.node, d.id)
  if (!g) return { ok: false, reason: d.name + ': el siguiente salto ' + r.via + ' no es alcanzable desde ' + (r.iface || 'su interfaz de salida') + ' (enlace caído o problema VLAN/trunk)', where: d.name }
  if (trail.some((t) => t.dev === g.dev.id)) return { ok: false, reason: 'Loop de enrutamiento entre ' + d.name + ' y ' + g.dev.name, where: d.name }
  return routeFrom(lab, g.dev, dst, trail.concat([{ dev: d.id, name: d.name, via: r.via }]), src, g.iface)
}

export function primaryIp(lab, d) {
  for (const [name, i] of Object.entries(d.interfaces)) {
    if (!i.ip) continue
    if (i.kind === 'svi' ? sviUp(d, name) : portUp(lab, d.id, name)) return i.ip
  }
  return null
}

export function pingSim(lab, srcId, dstIp) {
  const d = lab.devices[srcId]
  if (!d) return { ok: false, reason: 'Dispositivo desconocido' }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(String(dstIp))) return { ok: false, reason: 'Dirección IP inválida' }
  if (isEndpoint(d)) {
    if (!pcUp(lab, d.id)) return { ok: false, reason: d.name + ': sin enlace a la red (cable/AP caído o VLAN inexistente)' }
    const p = d.pc
    if (!inSubnet(p.gw, netOf(p.ip, p.mask), p.mask) && !inSubnet(dstIp, netOf(p.ip, p.mask), p.mask)) {
      return { ok: false, reason: d.name + ': su gateway ' + p.gw + ' está fuera de su subred ' + netOf(p.ip, p.mask) + '/' + maskLen(p.mask) + ' — configura TCP/IP correcta' }
    }
  }
  const srcIp = isEndpoint(d) ? d.pc.ip : primaryIp(lab, d)
  const fwd = routeFrom(lab, d, dstIp, [], srcIp, null)
  if (!fwd.ok) return fwd
  if (dstIp === INTERNET) {
    if (srcId !== 'R1' && srcId !== 'FW1' && srcId !== 'ISP' && srcIp) {
      const nat = routeFrom(lab, lab.devices['R1'], srcIp, [], srcIp, null)
      if (!nat.ok) return { ok: false, reason: 'El tráfico sale a Internet, pero NAT falla al regresar: ' + nat.reason }
    }
    return { ok: true, path: fwd.path }
  }
  const t = fwd.reached
  if (!t) return { ok: true, path: fwd.path }
  if (t.dev.id === d.id) return { ok: true, path: fwd.path }
  if (!srcIp) return { ok: true, path: fwd.path }
  const back = routeFrom(lab, t.dev, srcIp, [], dstIp, null)
  if (!back.ok) return { ok: false, reason: 'Ida OK, pero sin ruta de regreso: ' + back.reason, where: back.where }
  return { ok: true, path: fwd.path }
}

export function evaluateGoals(lab) {
  return lab.goals.map((g) => Object.assign({}, g, { res: evalGoal(lab, g) }))
}

function evalGoal(lab, g) {
  if (typeof g.check === 'function') {
    try {
      const r = g.check(lab)
      if (r === true) return { ok: true }
      if (r && typeof r === 'object') return r
      return { ok: false, reason: 'Tarea pendiente' }
    } catch (e) { return { ok: false, reason: 'No se pudo evaluar la tarea' } }
  }
  return pingSim(lab, g.src, g.dst)
}

export function allPing(lab, srcs, dst) {
  for (const src of srcs) {
    const r = pingSim(lab, src, dst)
    if (!r.ok) return { ok: false, reason: r.reason }
  }
  return { ok: true }
}

export function linkState(lab, l) {
  const devs = lab.devices
  if (l.kind === 'wifi') {
    const apSide = devs[l.a.dev] && devs[l.a.dev].type === 'ap' ? l.a : l.b
    const clSide = apSide === l.a ? l.b : l.a
    const ap = devs[apSide.dev], client = devs[clSide.dev]
    if (!ap || !client || !client.pc) return 'down'
    if (!physUp(lab, ap.id, 'Gi0/0')) return 'down'
    const ssid = (ap.ssids || []).find((s) => s.name === client.pc.ssid)
    return (ssid && ssid.vlan != null) ? 'ok' : 'mis'
  }
  const sideUp = (sd) => isEndpoint(devs[sd.dev]) ? pcUp(lab, sd.dev) : portUp(lab, sd.dev, sd.port)
  if (!sideUp(l.a) || !sideUp(l.b)) return 'down'
  if (l.kind === 'wan') return 'ok'
  const dA = devs[l.a.dev], dB = devs[l.b.dev]
  if (isSwitch(dA) && isSwitch(dB)) {
    if (linkBlocked(lab, l)) return 'stp'
    return carriedVlans(lab, l).length ? 'ok' : 'mis'
  }
  const swSide = isSwitch(dA) ? l.a : l.b
  const swD = devs[swSide.dev]
  const i = swD.interfaces[swSide.port]
  return (i && i.mode === 'access') ? 'ok' : 'mis'
}

export function deviceHealth(lab, id) {
  const d = lab.devices[id]
  if (!d) return 'ok'
  if (d.type === 'isp') return 'ok'
  if (isEndpoint(d)) return pcUp(lab, id) ? 'ok' : 'down'
  let worst = 'ok'
  for (const l of lab.links) {
    if (l.a.dev !== id && l.b.dev !== id) continue
    const st = linkState(lab, l)
    if (st === 'down') worst = 'down'
    else if ((st === 'mis' || st === 'stp') && worst !== 'down') worst = 'warn'
  }
  return worst
}

export function positionsFor(spec) {
  const P = {
    ISP: { x: 80, y: 80 }, FW1: { x: 262, y: 80 }, R1: { x: 455, y: 80 },
    SW1: { x: 455, y: 265 }, SW2: { x: 715, y: 265 },
    PC1: { x: 300, y: 452 }, PC2: { x: 625, y: 452 }, PC3: { x: 810, y: 452 },
  }
  if (!spec.topo.fw) P.ISP = { x: 200, y: 80 }
  if (spec.topo.sw3) { P.SW3 = { x: 880, y: 140 }; P.PC4 = { x: 880, y: 345 } }
  if (spec.topo.srv) P.SRV1 = { x: 610, y: 135 }
  if (spec.topo.cam) P.CAM1 = { x: 775, y: 95 }
  return P
}

export function labVlans(lab) {
  const set = new Set([99])
  for (const d of Object.values(lab.devices)) {
    if (d.vlans) for (const v of Object.keys(d.vlans)) set.add(+v)
    if (d.ssids) for (const s of d.ssids) if (s.vlan != null) set.add(+s.vlan)
  }
  return Array.from(set).sort((a, b) => a - b)
}

export function termOrder(lab) {
  const src = (lab.order && lab.order.length) ? lab.order : TOPO_ORDER
  return src.filter((id) => !!lab.devices[id] && hasCli(lab.devices[id]))
}

export function linkBetween(lab, idA, idB) {
  return lab.links.find((l) => (l.a.dev === idA && l.b.dev === idB) || (l.a.dev === idB && l.b.dev === idA)) || null
}

export function freePorts(lab, devId) {
  const d = lab.devices[devId]
  if (!d) return []
  if (isWireless(d)) return []
  if (isEndpoint(d)) return pcLinkOf(lab, devId) ? [] : ['NIC']
  if (!isSwitch(d)) return []
  return Object.keys(d.interfaces).filter((p) => {
    const i = d.interfaces[p]
    return i.kind === 'port' && i.status === 'up' && !linkOf(lab, devId, p)
  })
}

export function canConnect(lab, a, b) {
  if (!a || !b || a.dev === b.dev) return false
  const da = lab.devices[a.dev], db = lab.devices[b.dev]
  if (!da || !db) return false
  if (isWireless(da) || isWireless(db)) return false
  const sa = isSwitch(da), sb = isSwitch(db)
  const ea = isEndpoint(da), eb = isEndpoint(db)
  if (ea && eb) return false
  if (ea) return sb
  if (eb) return sa
  return sa && sb
}

export function cableKindOf(devA, devB) {
  const aEp = isEndpoint(devA), bEp = isEndpoint(devB)
  if (aEp && bEp) return null
  if (aEp || bEp) return 'directo'
  return 'cruzado'
}

export const CABLE_LABEL = { auto: 'Automático', directo: 'Directo', cruzado: 'Cruzado' }

export function connectPorts(lab, a, b, type) {
  if (!canConnect(lab, a, b)) return { ok: false, reason: 'No se pueden cablear esos dispositivos (PC/servidor/cámara ↔ PC no es válido).' }
  if (!freePorts(lab, a.dev).includes(a.port) || !freePorts(lab, b.dev).includes(b.port)) return { ok: false, reason: 'Alguno de los puertos ya está en uso.' }
  const da = lab.devices[a.dev], db = lab.devices[b.dev]
  const need = cableKindOf(da, db)
  const t = (!type || type === 'auto') ? need : type
  if (t !== need) {
    return { ok: false, reason: 'Cable incorrecto: entre ' + da.name + ' y ' + db.name + ' necesitas cable ' + CABLE_LABEL[need].toLowerCase() + ' (' + need + ').' }
  }
  const ea = isEndpoint(da) ? { dev: a.dev } : { dev: a.dev, port: a.port }
  const eb = isEndpoint(db) ? { dev: b.dev } : { dev: b.dev, port: b.port }
  const id = 'LX' + (lab.links.length + 1) + '-' + Math.floor(Math.random() * 1000)
  lab.links.push({ id, a: ea, b: eb, kind: 'eth', label: 'Cable ' + t })
  recompute(lab)
  return { ok: true, id, label: 'Cable ' + t + ': ' + da.name + ' ↔ ' + db.name }
}
