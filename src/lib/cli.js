// Consola Cisco IOS: modos user/priv/config/if/vlan/router, shows, ping y consola de PC
import { validIp, parseMask, maskLen, netOf, macOf, pad, isSwitch, isEndpoint, M0 } from './utils.js'
import { recompute, linkOf, otherSide, linkState, physUp, portUp, pcUp, sviUp, routesOf, primaryIp, labVlans, sameL2, pingSim, deliverTo, ospfNeighbors, linkBlocked, carriedVlans, aclAddrText, aclAppliesOn, encapOf, nativeOf } from './engine.js'

export function cliS(ctx, devId) {
  return ctx.sessions[devId] || (ctx.sessions[devId] = { mode: 'user', ifc: null, vid: null, out: [], hist: [], hi: -1 })
}

export function promptOf(d, sess) {
  switch (sess.mode) {
    case 'user': return d.name + '>'
    case 'priv': return d.name + '#'
    case 'config': return d.name + '(config)#'
    case 'if': return d.name + '(config-if)#'
    case 'vlan': return d.name + '(config-vlan)#'
    case 'router': return d.name + '(config-router)#'
    case 'line': return d.name + '(config-line)#'
    case 'dhcp': return d.name + '(dhcp-config)#'
    default: return d.name + '>'
  }
}

export function ensureConsole(ctx, devId) {
  const c = cliS(ctx, devId)
  if (!c.out.length) {
    const d = ctx.lab.devices[devId]
    c.out.push({ t: '══════════════════════════════════════════════', cls: 'dim' })
    c.out.push({ t: ' Cable de consola conectado a ' + d.name + ' (' + d.role + ')', cls: 'hdr' })
    c.out.push({ t: ' Simulador Cisco IOS — escribe "?" para ayuda', cls: 'dim' })
    c.out.push({ t: '══════════════════════════════════════════════', cls: 'dim' })
  }
  return c
}

function resolveIfc(d, argstr) {
  const norm = String(argstr).toLowerCase().replace(/[\s\/\-]/g, '')
  for (const name of Object.keys(d.interfaces)) {
    if (name.toLowerCase().replace(/[\s\/\-]/g, '') === norm) return { ok: name }
  }
  const m = norm.match(/^vlan(\d+)$/)
  if (m && isSwitch(d)) {
    const v = +m[1]
    if (!d.vlans[v]) return { err: '% VLAN ' + v + ' no existe. Créala primero con: vlan ' + v }
    const name = 'Vlan' + v
    if (!d.interfaces[name]) d.interfaces[name] = { kind: 'svi', ip: null, mask: null, status: 'up' }
    return { ok: name }
  }
  return { err: '% Interfaz desconocida. Usa show ip interface brief para ver las disponibles.' }
}

function parseVlanList(str, allVlans) {
  if (str.toLowerCase() === 'all') return allVlans.slice()
  const out = []
  for (const tok of str.split(',')) {
    const rg = tok.split('-')
    if (rg.length === 2) { for (let v = +rg[0]; v <= +rg[1]; v++) out.push(v) } else if (/^\d+$/.test(tok.trim())) out.push(+tok)
    else return null
  }
  return out
}

const ACL_PROTOS = ['ip', 'icmp', 'tcp', 'udp']
function parseAclAddr(toks, i) {
  const t = toks[i]
  if (t === 'any') return { match: 'any', next: i + 1 }
  if (t === 'host' && validIp(toks[i + 1])) return { match: 'host:' + toks[i + 1], next: i + 2 }
  if (validIp(t) && validIp(toks[i + 1])) return { match: t + '/' + toks[i + 1], next: i + 2 }
  return null
}

function portNote(ctx, devId, port, o) {
  const l = linkOf(ctx.lab, devId, port)
  if (!l) return
  const st = linkState(ctx.lab, l)
  const other = otherSide(l, devId)
  const od = ctx.lab.devices[other.dev]
  const oname = od.name + (other.port ? ' (' + other.port + ')' : '')
  if (st === 'ok') o('✔ Enlace hacia ' + oname + ': UP/UP — verde en el diagrama.', 'ok')
  else if (st === 'down') {
    const i = ctx.lab.devices[devId].interfaces[port]
    let why
    if (i && i.status !== 'up') why = 'este puerto sigue en shutdown'
    else if (!physUp(ctx.lab, devId, port)) why = 'la VLAN de acceso de este puerto no existe en el switch'
    else why = 'el extremo remoto ' + oname + ' sigue apagado o mal configurado'
    o('⚠ El enlace hacia ' + oname + ' sigue ROJO: ' + why + '.', 'err')
  } else if (st === 'stp') o('⚠ El puerto está administrativamente UP pero STP lo mantiene BLOQUEANDO (naranja punteado en el diagrama): resuelve el loop o aplica spanning-tree portfast [trunk].', 'err')
  else o('⚠ El enlace hacia ' + oname + ' sigue NARANJA: desajuste de trunking/VLAN con el vecino (compara switchport mode y show interfaces trunk en ambos extremos).', 'err')
}

/* ----------------------------- SHOW COMMANDS ----------------------------- */
function showIpIntBrief(lab, d, o) {
  o(pad('Interface', 22) + pad('IP-Address', 17) + pad('OK?', 4) + pad('Method', 8) + pad('Status', 22) + 'Protocol', 'hdr')
  for (const [name, i] of Object.entries(d.interfaces)) {
    let proto = 'down'
    if (i.kind === 'svi') proto = sviUp(d, name) ? 'up' : 'down'
    else if (i.kind === 'routed') proto = portUp(lab, d.id, name) ? 'up' : 'down'
    else proto = physUp(lab, d.id, name) ? 'up' : 'down'
    const err = isSwitch(d) && i.kind === 'port' && i.security && i.security.state === 'err-disabled'
    const st = i.status !== 'up' ? 'administratively down' : (err ? 'err-disabled' : 'up')
    o(pad(name, 22) + pad(i.ip || 'unassigned', 17) + pad('YES', 4) + pad('manual', 8) + pad(st, 22) + proto, proto === 'up' ? 'ok' : '')
  }
}

function showIpRoute(lab, d, o) {
  const rt = routesOf(lab, d)
  const seen = new Set()
  let gw = null
  o('Codes: C - connected, S - static, O - OSPF, * - candidate default', 'dim')
  o('')
  for (const r of rt) {
    const key = r.net + '/' + r.mask + r.type
    if (seen.has(key)) continue
    seen.add(key)
    const pre = r.net + '/' + maskLen(r.mask)
    if (r.type === 'connected') o('C    ' + pad(pre, 18) + 'is directly connected, ' + r.iface)
    else if (r.type === 'static') {
      if (r.default) gw = r.via
      o((r.default ? 'S*   ' : 'S    ') + pad(pre, 18) + '[1/0] via ' + r.via)
    } else if (r.type === 'ospf') o('O    ' + pad(pre, 18) + '[110/2] via ' + r.via + ', ' + (r.viaIface || 'SVI'))
  }
  if (gw) { o(''); o('Gateway of last resort is ' + gw + ' to network 0.0.0.0', 'hdr') }
}

function showVlanBrief(lab, d, o) {
  if (!isSwitch(d)) { o('% Comando disponible solo en switches.', 'err'); return }
  o(pad('VLAN', 6) + pad('Name', 26) + pad('Status', 10) + 'Ports', 'hdr')
  o(pad('----', 6) + pad('--------------------------------', 26) + pad('---------', 10) + '--------------------', 'dim')
  for (const [vid, name] of Object.entries(d.vlans)) {
    const ports = []
    for (const [p, i] of Object.entries(d.interfaces)) {
      if (i.kind === 'port' && i.mode === 'access' && i.accessVlan === +vid) ports.push(p + (physUp(lab, d.id, p) ? '' : '(down)'))
    }
    const active = ports.length === 0 || ports.some((p) => !p.includes('(down)'))
    o(pad(vid, 6) + pad(name, 26) + pad(active ? 'active' : 'act/lshut', 10) + ports.join(','))
  }
  const trunks = Object.entries(d.interfaces).filter(([p, i]) => i.kind === 'port' && i.mode === 'trunk').map(([p]) => p)
  if (trunks.length) { o(''); o('Puertos troncales (no aparecen arriba): ' + trunks.join(', '), 'dim') }
}

function showTrunk(lab, d, o) {
  if (!isSwitch(d)) { o('% Comando disponible solo en switches.', 'err'); return }
  const trunks = Object.entries(d.interfaces).filter(([p, i]) => i.kind === 'port' && i.mode === 'trunk')
  if (!trunks.length) { o('% No hay puertos en modo troncal en este switch.', 'err'); o('Sugerencia: show interfaces <puerto> switchport para ver el modo actual.', 'dim'); return }
  o(pad('Port', 9) + pad('Mode', 8) + pad('Encapsulation', 15) + pad('Native', 8) + pad('Status', 12) + 'Vlans permitidas', 'hdr')
  for (const [p, i] of trunks) {
    const blocked = d.stp && d.stp[p] === 'blocking'
    o(pad(p, 9) + pad(i.mode, 8) + pad(encapOf(i) === 'isl' ? 'isl' : '802.1q', 15) + pad(nativeOf(i), 8) + pad(blocked ? 'STP-BLK' : physUp(lab, d.id, p) ? 'trunking' : 'down', 12) + i.allowed.join(','))
  }
}

function showSwitchport(lab, d, o, argstr) {
  const r = resolveIfc(d, argstr.replace(/\s*switchport\s*$/i, '').trim())
  if (r.err) { o(r.err, 'err'); return }
  const name = r.ok, i = d.interfaces[name]
  o('Name: ' + name, 'hdr')
  if (i.kind === 'port') {
    o('  Administrative Mode: ' + (i.mode === 'trunk' ? 'trunk' : 'static access'))
    o('  Operational Mode: ' + (physUp(lab, d.id, name) ? (i.mode === 'trunk' ? 'trunk' : 'static access') : 'down'))
    o('  Access Mode VLAN: ' + (i.accessVlan != null ? i.accessVlan : 1))
    o('  Trunking Native Mode VLAN: ' + nativeOf(i))
    o('  Trunking Encapsulation: ' + encapOf(i))
    o('  Trunking VLANs Enabled: ' + (i.allowed.length ? i.allowed.join(',') : 'ALL'))
  } else {
    o('  Modo: ' + i.kind + (i.ip ? ' — ' + i.ip + '/' + maskLen(i.mask) : ''))
  }
}

function showStp(lab, d, o) {
  if (!isSwitch(d)) { o('% Comando disponible solo en switches.', 'err'); return }
  o(pad('VLAN', 8) + pad('Port', 10) + pad('Role', 8) + pad('Sts', 10) + pad('Cost', 7) + 'Portfast', 'hdr')
  for (const [p, i] of Object.entries(d.interfaces)) {
    if (i.kind !== 'port') continue
    const vlans = i.mode === 'access' ? [i.accessVlan] : (i.allowed || [])
    const st = (d.stp && d.stp[p]) || 'forwarding'
    for (const v of vlans) {
      if (v == null) continue
      o(pad('VLAN' + String(v).padStart(4, '0'), 8) + pad(p, 10) + pad('Desg', 8) + pad(st === 'forwarding' ? 'FWD' : 'BLK', 10) + pad('4', 7) + ((d.portfast && d.portfast[p]) ? 'True' : 'False'), st === 'forwarding' ? '' : 'err')
    }
  }
}

function showArp(lab, d, o) {
  o(pad('Protocol', 10) + pad('Address', 17) + pad('Age', 6) + pad('Hardware Addr', 16) + pad('Type', 7) + 'Interface', 'hdr')
  const rows = []
  for (const [name, i] of Object.entries(d.interfaces)) {
    if (!i.ip) continue
    let node = null, up = false
    if (i.kind === 'svi') { up = sviUp(d, name); node = d.id + '.' + name } else if (i.kind === 'routed') { up = portUp(lab, d.id, name); node = d.id + '.' + name }
    if (!up) continue
    for (const e of Object.values(lab.devices)) {
      if (e.id === d.id) continue
      if (isEndpoint(e)) {
        if (e.pc && pcUp(lab, e.id) && sameL2(lab, node, e.id)) rows.push([e.pc.ip, macOf(e.id), name])
      } else {
        for (const [n2, i2] of Object.entries(e.interfaces)) {
          if (!i2.ip) continue
          let node2 = null, up2 = false
          if (i2.kind === 'svi') { up2 = sviUp(e, n2); node2 = e.id + '.' + n2 } else if (i2.kind === 'routed') { up2 = portUp(lab, e.id, n2); node2 = e.id + '.' + n2 }
          if (up2 && sameL2(lab, node, node2)) rows.push([i2.ip, macOf(e.id + n2), name])
        }
      }
    }
    for (const l of lab.links) {
      let me = null, ot = null
      if (l.a.dev === d.id && l.a.port === name) { me = l.a; ot = l.b } else if (l.b.dev === d.id && l.b.port === name) { me = l.b; ot = l.a }
      if (!me || !ot || !ot.port) continue
      const od = lab.devices[ot.dev]
      if (isEndpoint(od)) continue
      const oi = od.interfaces[ot.port]
      if (oi && oi.ip && portUp(lab, od.id, ot.port) && !rows.some((r) => r[0] === oi.ip)) rows.push([oi.ip, macOf(od.id + ot.port), name])
    }
  }
  const uniq = []
  for (const r of rows) { if (!uniq.some((u) => u[0] === r[0])) uniq.push(r) }
  for (const r of uniq) o(pad('Internet', 10) + pad(r[0], 17) + pad('4', 6) + pad(r[1], 16) + pad('ARPA', 7) + r[2])
  if (!uniq.length) o('(tabla vacía: no hay vecinos L2 alcanzables)', 'dim')
}

function showAccessLists(lab, d, o) {
  const acls = d.acls || {}
  const names = Object.keys(acls)
  if (!names.length) { o('(no hay listas de control de acceso configuradas)', 'dim'); return }
  for (const name of names) {
    const where = aclAppliesOn(d, name)
    o('Extended IP access list ' + name + (where.length ? '  [aplicada en ' + where.join(', ') + ']' : '  (no aplicada)'), 'hdr')
    let seq = 10
    for (const e of acls[name]) {
      o('    ' + seq + ' ' + e.action + ' ' + (e.proto || 'ip') + ' ' + aclAddrText(e.src) + ' ' + aclAddrText(e.dst) + (e.dstPort ? ' eq ' + e.dstPort : ''))
      seq += 10
    }
    o('    (deny implícito al final de la lista)', 'dim')
  }
}

function showPortSecurity(lab, d, o) {
  if (!isSwitch(d)) { o('% Comando disponible solo en switches.', 'err'); return }
  const rows = Object.entries(d.interfaces).filter(([, i]) => i.kind === 'port' && i.security)
  if (!rows.length) { o('(no hay puertos con port-security configurado)', 'dim'); return }
  o(pad('Port', 10) + pad('Max', 6) + pad('Current', 9) + pad('Violation', 12) + 'Status', 'hdr')
  for (const [p, i] of rows) {
    const st = i.security.state === 'err-disabled' ? 'Secure-shutdown' : (i.status === 'up' ? 'Secure-up' : 'Disabled')
    o(pad(p, 10) + pad(i.security.max || 1, 6) + pad(1, 9) + pad(i.security.violation || 'shutdown', 12) + st, st === 'Secure-shutdown' ? 'err' : 'ok')
  }
}

function showWlan(lab, d, o) {
  if (d.type !== 'ap') { o('% El comando show wlan aplica solo en Access Points.', 'err'); return }
  const up = d.interfaces['Gi0/0']
  o('Access Point: ' + d.name, 'hdr')
  o('  Uplink Gi0/0: ' + (up ? (up.mode === 'trunk' ? 'trunk (vlans ' + (up.allowed.join(',') || '-') + ')' : 'access vlan ' + up.accessVlan) : '-'))
  o(pad('  SSID', 18) + pad('VLAN', 8) + 'Clientes', 'hdr')
  const list = d.ssids || []
  for (const s of list) {
    const clients = Object.values(lab.devices).filter((x) => x.pc && x.pc.ssid === s.name)
    o(pad('  ' + s.name, 18) + pad(s.vlan != null ? s.vlan : '-', 8) + clients.map((c) => c.name).join(', '), s.vlan != null ? 'ok' : 'err')
  }
  if (!list.length) o('  (sin SSIDs — configúralos con: ssid <nombre> vlan <id>)', 'dim')
}

function showNat(lab, d, o) {
  if (d.type !== 'router') { o('% Comando disponible en routers.', 'err'); return }
  const ins = Object.entries(d.interfaces).filter(([, i]) => i.natRole === 'inside').map(([n]) => n)
  const outs = Object.entries(d.interfaces).filter(([, i]) => i.natRole === 'outside').map(([n]) => n)
  o('NAT  inside [' + (ins.join(', ') || '-') + ']   outside [' + (outs.join(', ') || '-') + ']', 'hdr')
  o(pad('Pro', 8) + pad('Inside global', 18) + pad('Inside local', 18) + 'Outside global', 'hdr')
  if (!ins.length || !outs.length) { o('(sin traducciones — marca las interfaces con ip nat inside / ip nat outside)', 'dim'); return }
  for (const e of Object.values(lab.devices)) {
    if (!e.pc) continue
    o(pad('icmp', 8) + pad('203.0.113.2:1', 18) + pad(e.pc.ip + ':1', 18) + '8.8.8.8:1')
  }
}

const TYPE_NAME = { isp: 'Internet', firewall: 'Firewall', router: 'Router', l3switch: 'Switch L3', l2switch: 'Switch L2', ap: 'Access Point', server: 'Server', camera: 'Camera', wireless: 'Laptop', pc: 'PC' }

function showNtp(lab, d, o) {
  const srv = d.ntpServers || []
  o('NTP: ' + (srv.length ? 'cliente' : 'sin servidor configurado'), 'hdr')
  if (!srv.length) { o('(sin servidores NTP — usa: ntp server <ip>)', 'dim'); return }
  o(pad('Servidor', 18) + 'Estado', 'hdr')
  for (const ip of srv) {
    const reach = Object.values(lab.devices).some((x) => Object.values(x.interfaces).some((i) => i.ip === ip))
    o(pad(ip, 18) + (reach ? 'sincronizado' : 'inalcanzable (ningún equipo tiene esa IP)'), reach ? 'ok' : 'err')
  }
}

function showCdp(lab, d, o, proto) {
  o('Capability Codes: R - Router, S - Switch, H - Host', 'dim')
  o(pad('Device ID', 22) + pad('Local Intrfce', 14) + pad('Holdtme', 9) + pad('Capability', 12) + pad('Platform', 12) + 'Port ID', 'hdr')
  for (const l of lab.links) {
    let me = null, other = null
    if (l.a.dev === d.id) { me = l.a; other = l.b } else if (l.b.dev === d.id) { me = l.b; other = l.a }
    if (!me || !other) continue
    const od = lab.devices[other.dev]
    if (!od || od.type === 'isp') continue
    const cap = od.type === 'router' ? 'R' : isEndpoint(od) ? 'H' : 'S'
    o(pad(od.name, 22) + pad(isEndpoint(d) ? 'NIC' : (me.port || '-'), 14) + pad('150', 9) + pad(cap, 12) + pad(TYPE_NAME[od.type] || od.type, 12) + (other.port || 'NIC'))
  }
  if (proto === 'lldp') o('(LLDP — vecinos de capa 2 mostrados arriba)', 'dim')
}

function showDhcpBinding(lab, d, o) {
  const pools = d.dhcpPools || []
  if (!pools.length) { o('(sin pools DHCP configurados — usa: ip dhcp pool <nombre>)', 'dim'); return }
  for (const p of pools) o('Pool ' + p.name + '  red ' + (p.network || '?') + ' ' + (p.mask || '') + '  gateway ' + (p.router || '?'), 'hdr')
  o(pad('IP address', 18) + pad('Client-ID', 20) + pad('Lease', 12) + 'Pool', 'hdr')
  for (const p of pools) {
    if (!p.network) continue
    for (const e of Object.values(lab.devices)) {
      if (!e.pc) continue
      if (netOf(e.pc.ip, p.mask || '255.255.255.0') === p.network) o(pad(e.pc.ip, 18) + pad(macOf(e.id), 20) + pad('0d 23h', 12) + p.name)
    }
  }
}

function showRun(lab, d, o) {
  o('!', 'dim')
  o('hostname ' + d.name, 'hdr')
  o('!', 'dim')
  if (isEndpoint(d)) {
    o('!-- Configuración TCP/IP del equipo (consola de PC)', 'dim')
    o('ip address ' + d.pc.ip + ' ' + d.pc.mask)
    o('default-gateway ' + d.pc.gw)
    o('!', 'dim'); o('end', 'dim')
    return
  }
  if (isSwitch(d) && d.vlans) {
    for (const [vid, name] of Object.entries(d.vlans)) {
      o('vlan ' + vid)
      o(' name ' + name)
      o('!', 'dim')
    }
  }
  for (const [name, i] of Object.entries(d.interfaces)) {
    o('interface ' + name, 'hdr')
    if (i.desc) o(' description ' + i.desc, 'dim')
    if (i.kind === 'port') {
      if (i.mode === 'trunk') {
        o(' switchport mode trunk')
        o(' switchport trunk encapsulation ' + (encapOf(i) === 'isl' ? 'isl' : 'dot1q'), encapOf(i) === 'isl' ? 'err' : '')
        o(' switchport trunk native vlan ' + nativeOf(i), nativeOf(i) !== 1 ? 'err' : '')
        o(' switchport trunk allowed vlan ' + i.allowed.join(','))
      } else {
        o(' switchport mode access')
        o(' switchport access vlan ' + i.accessVlan)
      }
      if (d.stp && d.stp[name] === 'blocking') o(' ! Puerto bloqueado por STP (BLOCKING)', 'err')
      if (d.portfast && d.portfast[name]) o(' spanning-tree portfast')
      if (i.security) {
        o(' switchport port-security')
        if (i.security.max) o(' switchport port-security maximum ' + i.security.max)
        if (i.security.violation) o(' switchport port-security violation ' + i.security.violation)
        if (i.security.mac) o(' switchport port-security mac-address ' + i.security.mac)
        if (i.security.state === 'err-disabled') o(' ! Puerto en err-disabled por violación de port-security', 'err')
      }
      for (const a of (d.aclApply || [])) if (a.iface === name) o(' ip access-group ' + a.name + ' ' + a.dir)
    }    if (i.ip) o(' ip address ' + i.ip + ' ' + i.mask)
    if (i.natRole) o(' ip nat ' + i.natRole)
    if (i.status === 'down') o(' shutdown', 'err')
    else if (i.kind !== 'port') o(' no shutdown')
    o('!', 'dim')
  }
  if (d.ospf && d.ospf.enabled) {
    o('router ospf ' + d.ospf.process, 'hdr')
    for (const nw of d.ospf.networks) o(' network ' + nw.net + ' ' + nw.wild + ' area ' + nw.area)
    o('!', 'dim')
  }
  if (d.type === 'ap') for (const s of (d.ssids || [])) o('ssid ' + s.name + ' vlan ' + s.vlan)
  for (const r of d.staticRoutes || []) o('ip route ' + r.net + ' ' + r.mask + ' ' + r.via)
  for (const [aname, entries] of Object.entries(d.acls || {})) {
    for (const e of entries) o('access-list ' + aname + ' ' + e.action + ' ' + (e.proto || 'ip') + ' ' + aclAddrText(e.src) + ' ' + aclAddrText(e.dst) + (e.dstPort ? ' eq ' + e.dstPort : ''))
  }
  if (d.enableSecret) o('enable secret 5 $1$mERr$xxxxxxxxxxxxxxxx')
  if (d.svcEncrypt) o('service password-encryption')
  if (d.domain) o('ip domain-name ' + d.domain)
  for (const u of d.users || []) o('username ' + u.user + ' secret 5 $1$mERr$xxxxxxxxxxxxxxxx')
  for (const n of d.ntpServers || []) o('ntp server ' + n)
  for (const p of d.dhcpPools || []) {
    o('ip dhcp pool ' + p.name)
    if (p.network) o(' network ' + p.network + ' ' + p.mask)
    if (p.router) o(' default-router ' + p.router)
    if (p.dns) o(' dns-server ' + p.dns)
  }
  if (d.consolePass || d.consoleLogin) { o('line console 0'); if (d.consolePass) o(' password 7 0xxxxxxxxxxx'); if (d.consoleLogin) o(' login') }
  if (d.vtyPass || d.vtyLogin || d.vtyTransport) { o('line vty 0 4'); if (d.vtyPass) o(' password 7 0xxxxxxxxxxx'); if (d.vtyLogin) o(' login'); if (d.vtyTransport) o(' transport input ' + d.vtyTransport) }
  o('!', 'dim')
  o('end', 'dim')
}

function showIpProtocols(lab, d, o) {
  if (isEndpoint(d)) { o('% No aplica en equipos finales (PC/servidor/cámara/laptop).', 'err'); return }
  if (!d.ospf || !d.ospf.enabled) {
    o('% No hay procesos de enrutamiento dinámico configurados.', 'err')
    if ((d.staticRoutes || []).length) o('Existen rutas estáticas (show ip route).', 'dim')
    return
  }
  o('Routing Protocol is "ospf ' + d.ospf.process + '"', 'hdr')
  o('  Outgoing update filter list for all interfaces is not set')
  o('  Router ID: ' + (primaryIp(lab, d) || '0.0.0.0'))
  o('  Number of areas in this router is 1')
  o('  Routing for Networks:')
  for (const nw of d.ospf.networks) o('    ' + nw.net + ' ' + nw.wild + ' area ' + nw.area)
  const nbs = ospfNeighbors(lab, d)
  o('  Routing Information Sources:')
  o(pad('    Gateway', 20) + 'Distance      Last Update', 'dim')
  if (!nbs.length) o('    (sin vecinos OSPF — revisa enlaces y configuración del vecino)', 'err')
  for (const nb of nbs) o('    ' + pad(nb.via, 16) + '110')
}

function showInterfaces(lab, d, o, argstr) {
  const line = (name, i) => {
    const errDis = isSwitch(d) && i.kind === 'port' && i.security && i.security.state === 'err-disabled'
    const adminState = i.status === 'up' ? (errDis ? 'err-disabled' : 'up') : 'administratively down'
    let proto = i.kind === 'svi' ? (sviUp(d, name) ? 'up' : 'down') : i.kind === 'routed' ? (portUp(lab, d.id, name) ? 'up' : 'down') : (physUp(lab, d.id, name) ? 'up' : 'down')
    o(name + ' is ' + adminState + ', line protocol is ' + proto, proto === 'up' ? 'ok' : 'err')
    if (i.desc) o('  Description: ' + i.desc, 'dim')
    if (i.kind === 'port') {
      o('  Cap: ' + i.mode + ', Access VLAN: ' + (i.accessVlan != null ? i.accessVlan : '-') + ', Trunk VLANs: ' + (i.allowed.length ? i.allowed.join(',') : '-'))
      if (d.stp && d.stp[name]) o('  STP state: ' + d.stp[name].toUpperCase() + ((d.portfast && d.portfast[name]) ? ' (portfast)' : ''))
      if (i.security) o('  Port-security: enabled, violation ' + (i.security.violation || 'shutdown') + (errDis ? ' — ERR-DISABLED' : ''), errDis ? 'err' : '')
    }
    if (i.ip) o('  Internet address is ' + i.ip + '/' + maskLen(i.mask))
    o('  Hardware addr: ' + macOf(d.id + name), 'dim')
  }
  if (!argstr) {
    for (const [name, i] of Object.entries(d.interfaces)) { line(name, i); o('') }
    return
  }
  const r = resolveIfc(d, argstr)
  if (r.err) { o(r.err, 'err'); return }
  const i = d.interfaces[r.ok]
  line(r.ok, i)
  const l = linkOf(lab, d.id, r.ok)
  if (l) {
    const st = linkState(lab, l)
    const other = otherSide(l, d.id)
    o('  Enlace hacia ' + lab.devices[other.dev].name + (other.port ? ' (' + other.port + ')' : '') + ': ' + (st === 'ok' ? 'UP/UP ✔' : st === 'down' ? 'CAÍDO ✗' : st === 'stp' ? 'STP-BLOCKING' : 'VLAN-MISMATCH'), st === 'ok' ? 'ok' : 'err')
  }
}

function cliPing(lab, d, o, target) {
  const res = pingSim(lab, d.id, target)
  o('Sending 5, 100-byte ICMP Echos to ' + target + ', timeout is 2 seconds:')
  if (res.ok) {
    o('!!!!!', 'ok')
    o('Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms', 'ok')
  } else {
    o('.....', 'err')
    o('Success rate is 0 percent (0/5)', 'err')
    o('[DIAG] ' + res.reason, 'dim')
  }
}

function showCmd(ctx, d, o, toks) {
  const lab = ctx.lab
  const sub = (toks[1] || '').toLowerCase()
  if (sub === 'ip' && toks[2] === 'interface') return showIpIntBrief(lab, d, o)
  if (sub === 'ip' && toks[2] === 'nat') return showNat(lab, d, o)
  if (sub === 'ip' && toks[2] === 'dhcp') return showDhcpBinding(lab, d, o)
  if (sub === 'ntp') return showNtp(lab, d, o)
  if (sub === 'cdp') return showCdp(lab, d, o, 'cdp')
  if (sub === 'lldp') return showCdp(lab, d, o, 'lldp')
  if (sub === 'ip' && toks[2] === 'route') return showIpRoute(lab, d, o)
  if (sub === 'ip' && toks[2] === 'protocols') return showIpProtocols(lab, d, o)
  if (sub === 'ip' && toks[2] === 'arp') return showArp(lab, d, o)
  if (sub === 'vlan') return showVlanBrief(lab, d, o)
  if ((sub === 'interface' || sub === 'interfaces') && /switchport\s*$/i.test(toks.slice(2).join(' '))) return showSwitchport(lab, d, o, toks.slice(2).join(' '))
  if (sub === 'interfaces' && toks[2] === 'trunk') return showTrunk(lab, d, o)
  if (sub === 'interfaces') return showInterfaces(lab, d, o, toks.slice(2).join(' '))
  if (sub === 'interface') return showInterfaces(lab, d, o, toks.slice(2).join(' '))
  if (sub === 'spanning-tree') return showStp(lab, d, o)
  if (sub === 'access-lists') return showAccessLists(lab, d, o)
  if (sub === 'port-security') return showPortSecurity(lab, d, o)
  if (sub === 'wlan') return showWlan(lab, d, o)
  if (sub === 'running-config' || sub === 'run') return showRun(lab, d, o)
  if (sub === 'version') {
    o('Cisco IOS Software, Simulator Image (CCNA-LAB), Version 15.2(4)M11', 'hdr')
    o('TAC Support: https://www.cisco.com — simulación educativa', 'dim')
    o('Hostname: ' + d.name)
    o('Uptime: 3 days, 4 hours, 21 minutes', 'dim')
    return
  }
  o("% Invalid input detected at '^' marker.", 'err')
}

function helpFor(d, c, o) {
  const common = ['show ip interface brief', 'show ip route', 'show interfaces [X]', 'show running-config', 'show access-lists', 'show port-security', 'show wlan', 'show ip nat translations', 'show version', 'ping <ip>', 'exit']
  if (isEndpoint(d)) {
    o('Comandos disponibles (consola de PC):', 'hdr')
    o('  ipconfig                 Ver IP, máscara y gateway')
    o('  ip <ip> <máscara> <gw>   Configurar TCP/IP manualmente')
    o('  ping <ip>                Probar conectividad')
    o('  cls                      Limpiar pantalla')
    o('  help                     Esta ayuda')
    return
  }
  o('Comandos disponibles en modo ' + c.mode + ':', 'hdr')
  if (c.mode === 'user') o('  enable | ping <ip> | show ... | exit')
  if (c.mode === 'priv') o('  configure terminal | disable | ping <ip> | show ... | exit')
  if (c.mode === 'config') o('  interface <nombre> | vlan <id> | ip route <red> <máscara> <via> | router ospf 1 | access-list <n> <permit|deny> <proto> <origen> <destino> | ssid <nombre> vlan <id> | enable secret <clave> | username <u> secret <clave> | crypto key generate rsa | line console 0|vty 0 4 | ntp server <ip> | ip dhcp pool <nombre> | hostname <X> | no <cmd> ... | end | exit')
  if (c.mode === 'if') o('  ip address <ip> <máscara> | no ip address | shutdown | no shutdown | switchport mode access|trunk | switchport access vlan <id> | switchport trunk allowed vlan <lista|all|add X> | switchport trunk native vlan <id> | switchport trunk encapsulation dot1q | switchport port-security [...] | ip nat inside|outside | ip access-group <acl> <in|out> | spanning-tree portfast [trunk] | description <txt> | end | exit')
  if (c.mode === 'vlan') o('  name <nombre> | exit | end')
  if (c.mode === 'router') o('  network <red> <wildcard> area 0 | no network <red> | exit | end')
  o('  ' + common.join(' | '), 'dim')
}

function pcCommand(ctx, d, c, o, line) {
  const lab = ctx.lab
  const toks = line.split(' ')
  const cmd = toks[0].toLowerCase()
  if (cmd === 'ipconfig') {
    o('Configuración IP de ' + d.name, 'hdr')
    o('   Dirección IPv4. . . . . . . . . . : ' + d.pc.ip)
    o('   Máscara de subred . . . . . . . . : ' + d.pc.mask + ' (/' + maskLen(d.pc.mask) + ')')
    o('   Puerta de enlace predeterminada . : ' + d.pc.gw)
    o('   Subred detectada. . . . . . . . . : ' + netOf(d.pc.ip, d.pc.mask) + '/' + maskLen(d.pc.mask))
    if (!(netOf(d.pc.gw, d.pc.mask) === netOf(d.pc.ip, d.pc.mask))) o('   ⚠ ADVERTENCIA: el gateway NO está dentro de la subred del equipo.', 'err')
    o('   Enlace físico. . . . . . . . . . . : ' + (pcUp(lab, d.id) ? 'CONECTADO' : 'DESCONECTADO'), pcUp(lab, d.id) ? 'ok' : 'err')
    return
  }
  if (cmd === 'ip') {
    const [ip, mask, gw] = toks.slice(1)
    if (!ip || !mask || !gw || !validIp(ip) || !validIp(parseMask(mask)) || !validIp(gw)) { o('Uso: ip <dirección> <máscara|/prefijo> <gateway>', 'err'); return }
    d.pc.ip = ip; d.pc.mask = parseMask(mask); d.pc.gw = gw
    o('Configuración TCP/IP aplicada.', 'ok')
    if (netOf(gw, d.pc.mask) !== netOf(ip, d.pc.mask)) o('⚠ El gateway ' + gw + ' queda fuera de la subred ' + netOf(ip, d.pc.mask) + '/' + maskLen(d.pc.mask) + '.', 'err')
    return
  }
  if (cmd === 'ping') {
    const target = toks[1]
    if (!target || !validIp(target)) { o('Uso: ping <dirección-ip>', 'err'); return }
    o('Haciendo ping a ' + target + ' con 32 bytes de datos:')
    const res = pingSim(lab, d.id, target)
    if (res.ok) {
      for (let i = 0; i < 4; i++) o('Respuesta desde ' + target + ': bytes=32 tiempo=' + (1 + i % 3) + 'ms TTL=' + (58 + i % 4), 'ok')
      o('Estadísticas de ping: Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% de pérdida)', 'ok')
    } else {
      for (let i = 0; i < 4; i++) o('Tiempo de espera agotado para esta solicitud.', 'err')
      o('Estadísticas de ping: Paquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% de pérdida)', 'err')
      o('[DIAG] ' + res.reason, 'dim')
    }
    return
  }
  if (cmd === 'exit') { o('(la consola de la PC permanece abierta)', 'dim'); return }
  o("'" + toks[0] + "' no se reconoce como comando. Escribe 'help'.", 'err')
}

/* ----------------------------- EJECUTOR PRINCIPAL ----------------------------- */
export function execCommand(ctx, devId, line) {
  const lab = ctx.lab
  const d = lab.devices[devId]
  if (!d) return
  const c = cliS(ctx, devId)
  line = String(line).replace(/\s+/g, ' ').trim()
  if (!line) return
  c.hist.push(line); c.hi = c.hist.length
  const o = (t, cls) => c.out.push({ t: String(t), cls: cls || '' })
  o(promptOf(d, c) + ' ' + line, 'cmd')
  if (c.out.length > 900) c.out.splice(0, c.out.length - 900)
  if (d.type === 'isp') { o('El ISP (nube WAN) no es un dispositivo gestionable.', 'err'); recompute(lab); return }
  if (line === 'cls') { c.out = []; recompute(lab); return }
  if (line === '?' || line.toLowerCase() === 'help') { helpFor(d, c, o); recompute(lab); return }

  if (isEndpoint(d)) { pcCommand(ctx, d, c, o, line); recompute(lab); return }

  const toks = line.split(' ')
  const cmd = toks[0].toLowerCase()

  if (cmd === 'ping') {
    const target = toks[1]
    if (!target || !validIp(target)) { o('% Uso: ping <dirección-ip>', 'err'); recompute(lab); return }
    cliPing(lab, d, o, target); recompute(lab); return
  }
  if (cmd === 'show') { showCmd(ctx, d, o, toks); recompute(lab); return }

  if (cmd === 'copy' && (toks[1] === 'running-config' || toks[1] === 'run')) {
    o('Destination filename [startup-config]?')
    o('Building configuration...', 'dim')
    o('[OK]', 'ok')
    o('Configuración guardada en la NVRAM (startup-config).', 'dim')
    recompute(lab); return
  }
  if (cmd === 'write' || cmd === 'wr') {
    o('Building configuration...', 'dim')
    o('[OK]', 'ok')
    o('Configuración guardada en la NVRAM (startup-config).', 'dim')
    recompute(lab); return
  }

  if (c.mode === 'user') {
    if (cmd === 'enable') c.mode = 'priv'
    else if (cmd === 'exit') o('La sesión de consola permanece abierta (usa el selector de dispositivos).', 'dim')
    else o("% Invalid input detected at '^' marker. (usa enable para modo privilegiado, o ? para ayuda)", 'err')
    recompute(lab); return
  }
  if (c.mode === 'priv') {
    if (cmd === 'disable') c.mode = 'user'
    else if (cmd === 'configure' || cmd === 'conf') c.mode = 'config'
    else if (cmd === 'exit') c.mode = 'user'
    else if (cmd === 'end') { /* ya en priv */ }
    else o("% Invalid input detected at '^' marker. (desde modo privilegiado: configure terminal)", 'err')
    recompute(lab); return
  }
  if (cmd === 'end') { c.mode = 'priv'; c.ifc = null; c.vid = null; recompute(lab); return }
  if (cmd === 'exit') {
    if (c.mode === 'if' || c.mode === 'vlan' || c.mode === 'router' || c.mode === 'line' || c.mode === 'dhcp') c.mode = 'config'
    else if (c.mode === 'config') c.mode = 'priv'
    c.ifc = null; c.vid = null
    recompute(lab); return
  }

  if ((cmd === 'interface' || cmd === 'int') && (c.mode === 'config' || c.mode === 'if' || c.mode === 'vlan' || c.mode === 'router')) {
    const r = resolveIfc(d, toks.slice(1).join(' '))
    if (r.err) { o(r.err, 'err'); recompute(lab); return }
    c.ifc = r.ok; c.mode = 'if'; recompute(lab); return
  }
  if (cmd === 'vlan' && (c.mode === 'config' || c.mode === 'if' || c.mode === 'router')) {
    if (!isSwitch(d)) { o('% Este dispositivo no es un switch.', 'err'); recompute(lab); return }
    const vid = +toks[1]
    if (!vid || vid < 1 || vid > 4094) { o('% Usage: vlan <1-4094>', 'err'); recompute(lab); return }
    if (!d.vlans[vid]) d.vlans[vid] = 'VLAN' + String(vid).padStart(4, '0')
    c.vid = vid; c.mode = 'vlan'; recompute(lab); return
  }

  if (c.mode === 'config') {
    if (cmd === 'hostname') {
      if (!toks[1]) o('% Uso: hostname <nombre>', 'err')
      else { d.name = toks.slice(1).join('-'); o('Cambiando nombre del sistema...', 'dim'); recompute(lab) }
      return
    }
    if (cmd === 'interface' || cmd === 'int') {
      const r = resolveIfc(d, toks.slice(1).join(' '))
      if (r.err) { o(r.err, 'err'); recompute(lab); return }
      c.ifc = r.ok; c.mode = 'if'; recompute(lab); return
    }
    if (cmd === 'vlan') {
      if (!isSwitch(d)) { o('% Este dispositivo no es un switch.', 'err'); recompute(lab); return }
      const vid = +toks[1]
      if (!vid || vid < 1 || vid > 4094) { o('% Usage: vlan <1-4094>', 'err'); recompute(lab); return }
      if (!d.vlans[vid]) d.vlans[vid] = 'VLAN' + String(vid).padStart(4, '0')
      c.vid = vid; c.mode = 'vlan'; recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'vlan') {
      const vid = +toks[2]
      if (d.vlans && d.vlans[vid]) { delete d.vlans[vid]; o('VLAN ' + vid + ' eliminada.', 'dim'); recompute(lab) }
      else o('% VLAN ' + vid + ' no existe.', 'err')
      return
    }
    if (cmd === 'access-list') {
      const name = toks[1]
      const action = (toks[2] || '').toLowerCase()
      const proto = (toks[3] || '').toLowerCase()
      if (!name || (action !== 'permit' && action !== 'deny') || !ACL_PROTOS.includes(proto)) {
        o('% Uso: access-list <nombre> <permit|deny> <ip|icmp|tcp|udp> <origen> <destino>', 'err'); recompute(lab); return
      }
      const src = parseAclAddr(toks, 4)
      const dst = src && parseAclAddr(toks, src.next)
      if (!src || !dst) {
        o('% Origen/destino inválidos. Usa "any", "host <ip>" o "<red> <wildcard>".', 'err'); recompute(lab); return
      }
      let dstPort = null
      if ((toks[dst.next] || '').toLowerCase() === 'eq') {
        const p = +toks[dst.next + 1]
        if (!p || p < 1 || p > 65535) { o('% Puerto inválido después de "eq".', 'err'); recompute(lab); return }
        if (proto !== 'tcp' && proto !== 'udp') { o('% "eq <puerto>" solo aplica a tcp o udp.', 'err'); recompute(lab); return }
        dstPort = p
      }
      d.acls = d.acls || {}
      d.acls[name] = (d.acls[name] || []).concat([{ action, proto, src: src.match, dst: dst.match, dstPort }])
      o('Entrada agregada a la ACL ' + name + ': ' + action + ' ' + proto + ' ' + aclAddrText(src.match) + ' ' + aclAddrText(dst.match) + (dstPort ? ' eq ' + dstPort : ''), 'ok')
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'access-list') {
      const name = toks[2]
      if (name && d.acls && d.acls[name]) {
        delete d.acls[name]
        d.aclApply = (d.aclApply || []).filter((a) => a.name !== name)
        o('ACL ' + name + ' eliminada.', 'dim')
      } else o('% La ACL ' + (name || '') + ' no existe.', 'err')
      recompute(lab); return
    }
    if (cmd === 'ssid') {
      if (d.type !== 'ap') { o('% El comando ssid solo aplica en Access Points.', 'err'); recompute(lab); return }
      const name = toks[1]
      const vid = +toks[3]
      if (!name || (toks[2] || '').toLowerCase() !== 'vlan' || !vid || vid < 1 || vid > 4094) {
        o('% Uso: ssid <nombre> vlan <id>', 'err'); recompute(lab); return
      }
      if (!d.vlans[vid]) d.vlans[vid] = 'VLAN' + String(vid).padStart(4, '0')
      d.ssids = (d.ssids || []).filter((s) => s.name !== name)
      d.ssids.push({ name, vlan: vid })
      const up = d.interfaces['Gi0/0']
      if (up) { up.mode = 'trunk'; up.allowed = Array.from(new Set(up.allowed.concat(vid))).sort((a, b) => a - b) }
      o('SSID ' + name + ' → VLAN ' + vid + ' (uplink Gi0/0 en troncal con la VLAN permitida).', 'ok')
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'ssid') {
      d.ssids = (d.ssids || []).filter((s) => s.name !== toks[2])
      o('SSID ' + (toks[2] || '') + ' eliminado.', 'dim')
      recompute(lab); return
    }
    if (cmd === 'ip' && toks[1] === 'route') {
      const [net, mask, via] = toks.slice(2)
      if (!net || !mask || !via || !validIp(net) || !validIp(mask) || !validIp(via)) { o('% Uso: ip route <red> <máscara> <siguiente-salto>', 'err'); recompute(lab); return }
      d.staticRoutes = d.staticRoutes || []
      d.staticRoutes = d.staticRoutes.filter((r) => !(r.net === net && r.mask === mask))
      d.staticRoutes.push({ net, mask, via })
      o('Ruta estática ' + net + '/' + maskLen(mask) + ' vía ' + via + ' instalada.', 'ok')
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'ip' && toks[2] === 'route') {
      const [net, mask] = toks.slice(3)
      if (!net || !mask) { o('% Uso: no ip route <red> <máscara>', 'err'); recompute(lab); return }
      d.staticRoutes = (d.staticRoutes || []).filter((r) => !(r.net === net && r.mask === mask))
      o('Ruta eliminada.', 'dim')
      recompute(lab); return
    }
    if (cmd === 'router' && (toks[1] || '').toLowerCase() === 'ospf') {
      if (d.type === 'l2switch') { o('% Los switches L2 no enrutan.', 'err'); recompute(lab); return }
      const proc = +toks[2] || 1
      d.ospf = d.ospf || { enabled: false, process: proc, networks: [] }
      d.ospf.enabled = true; d.ospf.process = proc
      c.mode = 'router'; recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'router') {
      if (d.ospf) { d.ospf = { enabled: false, process: d.ospf.process, networks: [] }; o('Proceso de enrutamiento eliminado.', 'dim'); recompute(lab) }
      else o('% No hay proceso que eliminar.', 'err')
      return
    }
    if (cmd === 'enable' && toks[1] === 'secret') {
      if (!toks[2]) { o('% Uso: enable secret <contraseña>', 'err'); recompute(lab); return }
      d.enableSecret = toks[2]; o('Contraseña de modo privilegiado configurada.', 'ok'); recompute(lab); return
    }
    if (cmd === 'service' && toks[1] === 'password-encryption') {
      d.svcEncrypt = true; o('Cifrado de contraseñas habilitado.', 'ok'); recompute(lab); return
    }
    if (cmd === 'ip' && toks[1] === 'domain-name') {
      if (!toks[2]) { o('% Uso: ip domain-name <nombre>', 'err'); recompute(lab); return }
      d.domain = toks[2]; recompute(lab); return
    }
    if (cmd === 'username') {
      const u = toks[1], kind = toks[2], p = toks[3]
      if (!u || (kind !== 'secret' && kind !== 'password') || !p) { o('% Uso: username <usuario> secret <contraseña>', 'err'); recompute(lab); return }
      d.users = (d.users || []).filter((x) => x.user !== u); d.users.push({ user: u, pass: p }); o('Usuario ' + u + ' configurado.', 'ok'); recompute(lab); return
    }
    if (cmd === 'crypto' && toks[1] === 'key' && toks[2] === 'generate' && toks[3] === 'rsa') {
      d.rsa = true; o('Generando llaves RSA (1024 bits)... [OK]', 'ok'); o('SSH habilitado.', 'dim'); recompute(lab); return
    }
    if (cmd === 'line' && (toks[1] === 'console' || toks[1] === 'vty')) {
      c.mode = 'line'; c.line = toks[1]; recompute(lab); return
    }
    if (cmd === 'ntp' && toks[1] === 'server') {
      if (!validIp(toks[2])) { o('% Uso: ntp server <ip>', 'err'); recompute(lab); return }
      d.ntpServers = d.ntpServers || []; if (!d.ntpServers.includes(toks[2])) d.ntpServers.push(toks[2])
      o('Servidor NTP ' + toks[2] + ' configurado.', 'ok'); recompute(lab); return
    }
    if (cmd === 'ip' && toks[1] === 'dhcp' && toks[2] === 'pool') {
      const name = toks[3]
      if (!name) { o('% Uso: ip dhcp pool <nombre>', 'err'); recompute(lab); return }
      d.dhcpPools = d.dhcpPools || []
      if (!d.dhcpPools.some((p) => p.name === name)) d.dhcpPools.push({ name })
      c.pool = name; c.mode = 'dhcp'; o('Pool DHCP ' + name + ' creado.', 'ok'); recompute(lab); return
    }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  if (c.mode === 'vlan') {
    if (cmd === 'name') {
      if (!toks[1]) o('% Usage: name <nombre>', 'err')
      else d.vlans[c.vid] = toks.slice(1).join(' ')
      recompute(lab); return
    }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  if (c.mode === 'router') {
    if (cmd === 'network') {
      const [net, wild, areaKw, area] = toks.slice(1)
      if (!net || !validIp(net)) { o('% Uso: network <red> <wildcard> area <n>', 'err'); recompute(lab); return }
      const w = wild || '0.0.0.255'
      if (!validIp(w)) { o('% Wildcard inválido.', 'err'); recompute(lab); return }
      if (areaKw && areaKw.toLowerCase() !== 'area') { o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return }
      d.ospf.networks = d.ospf.networks.filter((nw) => nw.net !== net)
      d.ospf.networks.push({ net, wild: w, area: area ? +area : 0 })
      o('Declaración network ' + net + ' ' + w + ' area ' + (area ? area : 0) + ' agregada al OSPF.', 'ok')
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'network') {
      d.ospf.networks = d.ospf.networks.filter((nw) => nw.net !== toks[2])
      recompute(lab); return
    }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  if (c.mode === 'line') {
    if (cmd === 'password') {
      const p = toks.slice(1).join(' ')
      if (!p) { o('% Uso: password <contraseña>', 'err'); recompute(lab); return }
      if (c.line === 'console') d.consolePass = p; else d.vtyPass = p
      o('Contraseña configurada en line ' + c.line + '.', 'ok'); recompute(lab); return
    }
    if (cmd === 'login') {
      if (c.line === 'console') d.consoleLogin = true; else d.vtyLogin = true
      o('Login habilitado en line ' + c.line + '.', 'ok'); recompute(lab); return
    }
    if (cmd === 'transport' && toks[1] === 'input') {
      d.vtyTransport = toks.slice(2).join(' ') || 'ssh'
      o('Transport input: ' + d.vtyTransport + '.', 'ok'); recompute(lab); return
    }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  if (c.mode === 'dhcp') {
    const pool = (d.dhcpPools || []).find((p) => p.name === c.pool)
    if (!pool) { c.mode = 'config'; recompute(lab); return }
    if (cmd === 'network') {
      if (!validIp(toks[1]) || !validIp(toks[2])) { o('% Uso: network <red> <máscara>', 'err'); recompute(lab); return }
      pool.network = toks[1]; pool.mask = toks[2]; o('Red del pool: ' + toks[1] + ' ' + toks[2], 'ok'); recompute(lab); return
    }
    if (cmd === 'default-router') {
      if (!validIp(toks[1])) { o('% Uso: default-router <ip>', 'err'); recompute(lab); return }
      pool.router = toks[1]; o('Puerta de enlace del pool: ' + toks[1], 'ok'); recompute(lab); return
    }
    if (cmd === 'dns-server') { pool.dns = toks[1]; o('DNS del pool: ' + toks[1], 'ok'); recompute(lab); return }
    if (cmd === 'exit') { c.mode = 'config'; recompute(lab); return }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  if (c.mode === 'if') {
    const i = d.interfaces[c.ifc]
    if (!i) { o('% Interfaz inexistente.', 'err'); c.mode = 'config'; recompute(lab); return }
    if (cmd === 'ip' && toks[1] === 'address') {
      if (i.kind === 'port') {
        const s = lab.spec
        o('% Es un puerto L2 del switch. Asigna la IP a una SVI (interface Vlan' + (s.va + '/' + s.vv + '/' + s.vs + (s.topo.sw3 ? '/' + s.vc : '')) + ') o usa switchport.', 'err')
        recompute(lab); return
      }
      const [ip, mask] = toks.slice(2)
      if (!ip || !mask || !validIp(ip) || !validIp(parseMask(mask))) { o('% Uso: ip address <ip> <máscara|/prefijo>', 'err'); recompute(lab); return }
      i.ip = ip; i.mask = parseMask(mask)
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'ip' && toks[2] === 'address') { i.ip = null; i.mask = null; recompute(lab); return }
    if (cmd === 'shutdown' || cmd === 'shut') { i.status = 'down'; portNote(ctx, d.id, c.ifc, o); recompute(lab); return }
    if (cmd === 'no' && (toks[1] === 'shutdown' || toks[1] === 'shut')) {
      i.status = 'up'
      if (i.security && i.security.state === 'err-disabled') { i.security.state = 'secure-up'; o('✔ Puerto recuperado del estado err-disabled.', 'ok') }
      portNote(ctx, d.id, c.ifc, o); recompute(lab); return
    }
    if (cmd === 'ip' && toks[1] === 'nat' && (toks[2] === 'inside' || toks[2] === 'outside')) {
      i.natRole = toks[2]
      o('Interfaz ' + c.ifc + ' marcada como NAT ' + toks[2] + '.', 'ok')
      recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'ip' && toks[2] === 'nat') { i.natRole = null; recompute(lab); return }
    if (cmd === 'ip' && toks[1] === 'access-group') {
      const name = toks[2]
      const dir = (toks[3] || '').toLowerCase()
      if (!name || (dir !== 'in' && dir !== 'out')) { o('% Uso: ip access-group <nombre> <in|out>', 'err'); recompute(lab); return }
      d.aclApply = (d.aclApply || []).filter((a) => !(a.iface === c.ifc && a.dir === dir))
      d.aclApply.push({ iface: c.ifc, dir, name })
      o('ACL ' + name + ' aplicada en ' + c.ifc + ' ' + dir + '.', 'ok')
      portNote(ctx, d.id, c.ifc, o); recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'ip' && toks[2] === 'access-group') {
      const name = toks[3]
      const dir = (toks[4] || '').toLowerCase()
      const before = (d.aclApply || []).length
      d.aclApply = (d.aclApply || []).filter((a) => !(a.iface === c.ifc && (!name || a.name === name) && (!dir || a.dir === dir)))
      if ((d.aclApply || []).length < before) { o('ACL removida de ' + c.ifc + '.', 'dim'); portNote(ctx, d.id, c.ifc, o) }
      else o('% No hay una ACL aplicada que coincida.', 'err')
      recompute(lab); return
    }
    if (cmd === 'switchport') {
      if (!isSwitch(d) || i.kind !== 'port') { o('% Comando solo válido en puertos L2 de switches.', 'err'); recompute(lab); return }
      if (toks[1] === 'mode' && (toks[2] === 'access' || toks[2] === 'trunk')) {
        i.mode = toks[2]
        if (i.mode === 'access' && i.accessVlan == null) i.accessVlan = 1
        if (i.mode === 'trunk' && !i.allowed.length) i.allowed = labVlans(lab).filter((v) => v !== 1)
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      if (toks[1] === 'access' && toks[2] === 'vlan') {
        const v = +toks[3]
        if (!v) { o('% Uso: switchport access vlan <id>', 'err'); recompute(lab); return }
        if (!d.vlans[v]) { o('% VLAN ' + v + ' no existe en este switch (créala con vlan ' + v + ' o asígnela correctamente).', 'err'); recompute(lab); return }
        i.mode = 'access'; i.accessVlan = v
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      if (toks[1] === 'trunk' && toks[2] === 'allowed' && toks[3] === 'vlan') {
        const arg = toks.slice(4).join('')
        if (toks[4] === 'add') {
          const add = parseVlanList(toks.slice(5).join(','), labVlans(lab))
          if (!add) { o('% Lista de VLAN inválida.', 'err'); recompute(lab); return }
          i.mode = 'trunk'
          i.allowed = Array.from(new Set(i.allowed.concat(add))).sort((a, b) => a - b)
          portNote(ctx, d.id, c.ifc, o); recompute(lab); return
        }
        const list = parseVlanList(arg, labVlans(lab))
        if (!list) { o('% Lista de VLAN inválida. Ej: switchport trunk allowed vlan 20,30 | all', 'err'); recompute(lab); return }
        i.mode = 'trunk'; i.allowed = Array.from(new Set(list)).sort((a, b) => a - b)
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      if (toks[1] === 'trunk' && toks[2] === 'native' && toks[3] === 'vlan') {
        const v = +toks[4]
        if (!v) { o('% Uso: switchport trunk native vlan <id>', 'err'); recompute(lab); return }
        i.mode = 'trunk'; i.nativeVlan = v
        o('VLAN nativa del troncal: ' + v + '.', 'ok')
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      if (toks[1] === 'trunk' && toks[2] === 'encapsulation') {
        const e = (toks[3] || '').toLowerCase()
        if (e !== 'dot1q' && e !== 'isl') { o('% Uso: switchport trunk encapsulation dot1q|isl', 'err'); recompute(lab); return }
        i.encap = e
        o('Encapsulación del troncal: ' + (e === 'isl' ? 'ISL' : '802.1Q (dot1q)') + (e === 'isl' ? ' — el requerimiento del cliente es dot1q.' : ''), e === 'isl' ? 'err' : 'ok')
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      if (toks[1] === 'port-security') {
        i.security = i.security || { enabled: true, max: 1, violation: 'shutdown', state: 'secure-up' }
        if (toks[2] === 'maximum') {
          const n = +toks[3]
          if (!n || n < 1) { o('% Uso: switchport port-security maximum <n>', 'err'); recompute(lab); return }
          i.security.max = n
        } else if (toks[2] === 'mac-address' && toks[3] === 'sticky') {
          i.security.mac = 'sticky'
        } else if (toks[2] === 'violation' && ['protect', 'restrict', 'shutdown'].includes(toks[3])) {
          i.security.violation = toks[3]
        } else if (toks[2]) {
          o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
        }
        o('Port-security configurado en ' + c.ifc + '.', 'ok')
        portNote(ctx, d.id, c.ifc, o); recompute(lab); return
      }
      o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'switchport' && toks[2] === 'trunk' && toks[3] === 'native') {
      i.nativeVlan = 1; o('VLAN nativa restablecida a 1.', 'dim'); portNote(ctx, d.id, c.ifc, o); recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'switchport' && toks[2] === 'trunk' && toks[3] === 'encapsulation') {
      i.encap = 'dot1q'; recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'switchport' && toks[2] === 'port-security') {
      if (i.security) { delete i.security; o('Port-security deshabilitado en ' + c.ifc + '.', 'dim') }
      else o('% El puerto no tiene port-security configurado.', 'err')
      portNote(ctx, d.id, c.ifc, o); recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'switchport' && toks[2] === 'access') {
      if (i.kind === 'port') { i.accessVlan = 1; portNote(ctx, d.id, c.ifc, o); recompute(lab) }
      return
    }
    if (cmd === 'spanning-tree' && (toks[1] || '').toLowerCase() === 'portfast') {
      if (!isSwitch(d) || i.kind !== 'port') { o('% portfast aplica en puertos de switches.', 'err'); recompute(lab); return }
      d.stp = d.stp || {}; d.stp[c.ifc] = 'forwarding'
      d.portfast = d.portfast || {}; d.portfast[c.ifc] = true
      o('% Portfast activado: el puerto pasa inmediatamente a FORWARDING.', 'dim')
      portNote(ctx, d.id, c.ifc, o); recompute(lab); return
    }
    if (cmd === 'no' && toks[1] === 'spanning-tree' && toks[2] === 'portfast') {
      d.portfast = d.portfast || {}; delete d.portfast[c.ifc]
      recompute(lab); return
    }
    if (cmd === 'description') { i.desc = toks.slice(1).join(' '); recompute(lab); return }
    o("% Invalid input detected at '^' marker.", 'err'); recompute(lab); return
  }

  recompute(lab)
}
