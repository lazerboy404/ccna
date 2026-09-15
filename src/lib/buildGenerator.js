// Generador de laboratorios de CONSTRUCCIÓN: topología variable (edificio/piso nuevo),
// N equipos desconectados y una VLAN nueva por crear. El usuario cablea con clic y configura por CLI.
import { mulberry32, M24, INTERNET, isSwitch } from './utils.js'
import { generateSpec, buildDevices, buildLinks, TOPO_ORDER } from './labGenerator.js'
import { recompute, sviUp, pcUp, linkBetween, carriedVlans, positionsFor, allPing } from './engine.js'

const BUILDINGS = ['Edificio B', 'Planta Alta', 'Bodega Norte', 'Ala Este', 'Edificio de Contabilidad', 'Planta de Produccion', 'Modulo Aeropuerto', 'Almacen Central', 'Edificio de TI', 'Sucursal Sur']
const AREAS = [['RRHH', 'RECURSOS HUMANOS'], ['CONTA', 'CONTABILIDAD'], ['INVITADOS', 'INVITADOS'], ['OPER', 'OPERACIONES'], ['LAB', 'LABORATORIO'], ['WIFI', 'WIFI-CORP'], ['CCTV', 'CAMARAS'], ['PRINT', 'IMPRESORAS'], ['ALMACEN', 'ALMACEN'], ['NOMINA', 'NOMINA']]
const PC_NAME_POOL = ['PC-RRHH', 'PC-NOMINA', 'PC-COMPRAS', 'PC-ALMACEN', 'PC-RECEP', 'PC-CALIDAD', 'PC-LOGISTICA', 'PC-CONTA2', 'PC-MKT', 'PC-OPER', 'PC-LAB', 'PC-BODEGA']
const VLAN_POOL = [50, 60, 70, 80, 90, 100, 110, 120, 150, 160, 170, 180, 190, 200]

const port = (vlan, desc) => ({ kind: 'port', mode: 'access', accessVlan: vlan == null ? 1 : vlan, allowed: [], status: 'up', desc: desc || '' })
const addPorts = (d, names) => { for (const n of names) if (!d.interfaces[n]) d.interfaces[n] = port(1, 'Puerto disponible') }
const ensureVlan1 = (d) => { if (d.vlans) d.vlans[1] = d.vlans[1] || 'default' }
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)]

export function generateConstructionLab(seed, sc) {
  const rnd = mulberry32((seed >>> 0) ^ 0x1b2c3d4e)
  const spec = generateSpec(seed >>> 0, sc)
  spec.topo.sw3 = false
  const template = sc.template || 'building'
  const used = [99, spec.va, spec.vv, spec.vs]
  const vlan = pick(rnd, VLAN_POOL.filter((v) => !used.includes(v)))
  const [areaKey, areaName] = pick(rnd, AREAS)
  const building = pick(rnd, BUILDINGS)
  const nPcs = 3 + Math.floor(rnd() * 4)
  const octet = spec.B + 1 + Math.floor(rnd() * 15)
  const vnet = '10.' + octet + '.' + vlan + '.0'
  const gw = '10.' + octet + '.' + vlan + '.1'
  const accSw = template === 'building' ? 'SWB' : 'SW2'
  const swName = template === 'building' ? 'SW-' + areaKey : spec.names.sw2

  const devices = buildDevices(spec)
  for (const d of Object.values(devices)) if (isSwitch(d)) ensureVlan1(d)
  addPorts(devices.SW1, ['Gi0/5', 'Gi0/6', 'Gi0/7', 'Gi0/8'])
  addPorts(devices.SW2, ['Gi0/4', 'Gi0/5', 'Gi0/6', 'Gi0/7', 'Gi0/8', 'Gi0/9', 'Gi0/10', 'Gi0/11', 'Gi0/12'])

  const pcNames = PC_NAME_POOL.slice().sort(() => rnd() - 0.5).slice(0, nPcs)
  const pcs = []
  for (let i = 0; i < nPcs; i++) {
    const id = 'PCB' + (i + 1)
    const ip = '10.' + octet + '.' + vlan + '.' + (10 + i)
    devices[id] = { id, name: pcNames[i], type: 'pc', role: building + ' (' + areaName + ')', interfaces: {}, pc: { ip, mask: M24, gw } }
    pcs.push({ id, name: pcNames[i], ip })
  }

  if (template === 'building') {
    devices.SWB = {
      id: 'SWB', name: swName, type: 'l2switch', role: 'Switch de acceso (' + building + ')',
      vlans: { 1: 'default' }, interfaces: {
        'Gi0/1': port(1, 'Uplink al core (troncal)'),
        'Gi0/2': port(1, 'Acceso'), 'Gi0/3': port(1, 'Acceso'), 'Gi0/4': port(1, 'Acceso'),
        'Gi0/5': port(1, 'Acceso'), 'Gi0/6': port(1, 'Acceso'), 'Gi0/7': port(1, 'Acceso'), 'Gi0/8': port(1, 'Acceso'),
      },
      stp: {}, portfast: {}, staticRoutes: [], ospf: null,
    }
  }

  const links = buildLinks(spec)
  const order = TOPO_ORDER.filter((id) => !!devices[id])
  if (template === 'building') order.push('SWB')
  order.push(...pcs.map((p) => p.id))

  const positions = Object.assign({}, positionsFor(spec))
  if (template === 'building') positions.SWB = { x: 480, y: 585 }
  const bandY = 690
  const gapX = 150
  pcs.forEach((p, i) => { positions[p.id] = { x: 480 + (i - (pcs.length - 1) / 2) * gapX, y: bandY } })

  const goalSpec = buildConstructionGoals(spec, { template, vlan, vlanName: areaName, vnet, gw, accSw, swId: 'SWB', swName, pcs, building })
  const build = {
    template, building, area: areaName, vlan, vlanName: areaName, vnet, gw, accSw, swId: 'SWB', swName, pcs,
    hints: buildHints(spec, { template, vlan, vlanName: areaName, gw, accSw, swName, pcs }),
    solution: buildSolution(spec, { template, vlan, vlanName: areaName, gw, accSw, swId: 'SWB', swName }),
  }
  spec.build = build
  const lab = {
    mode: 'build', spec, scenario: sc, devices, links, order, positions,
    viewBox: '0 0 960 765',
    faults: [], goals: goalSpec, build,
    hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null,
  }
  recompute(lab)
  return lab
}

function pcSwitchPort(lab, pcId) {
  const lk = lab.links.find((x) => x.a.dev === pcId || x.b.dev === pcId)
  if (!lk) return null
  const sw = lk.a.dev === pcId ? lk.b : lk.a
  return sw.port ? { dev: sw.dev, port: sw.port } : null
}
function accessOk(lab, pcs, accSw, vlan) {
  for (const p of pcs) {
    const sp = pcSwitchPort(lab, p.id)
    if (!sp || sp.dev !== accSw) return { ok: false, reason: p.name + ' no está conectado a ' + (lab.devices[accSw] ? lab.devices[accSw].name : accSw) }
    const i = lab.devices[sp.dev].interfaces[sp.port]
    if (!i || i.mode !== 'access' || i.accessVlan !== vlan) return { ok: false, reason: p.name + ': el puerto ' + sp.port + ' debe estar en access vlan ' + vlan }
  }
  return { ok: true }
}
function allUp(lab, pcs) {
  for (const p of pcs) if (!pcUp(lab, p.id)) return { ok: false, reason: p.name + ' no tiene enlace (cable o VLAN del puerto)' }
  return { ok: true }
}

function buildConstructionGoals(spec, b) {
  const pcIds = b.pcs.map((p) => p.id)
  const sw1 = spec.names.sw1
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  const g = []
  if (b.template === 'building') {
    g.push({ id: 'c-cable', label: 'Cablear ' + sw1 + ' ↔ ' + accName, check: (l) => linkBetween(l, 'SW1', b.swId) ? true : { ok: false, reason: 'No hay ningún cable entre ' + sw1 + ' y ' + accName + ' (usa el botón 🔌 Cablear)' } })
  }
  g.push({ id: 'c-vlan', label: 'Crear la VLAN ' + b.vlan + ' (' + b.vlanName + ') en ' + sw1 + ' y ' + accName, check: (l) => {
    const a = l.devices.SW1.vlans && l.devices.SW1.vlans[b.vlan]
    const c = l.devices[b.accSw].vlans && l.devices[b.accSw].vlans[b.vlan]
    if (a && c) return true
    return { ok: false, reason: 'Falta la VLAN ' + b.vlan + ' en ' + (!a ? sw1 : accName) + ' (comando: vlan ' + b.vlan + ') — recuerda crearla en AMBOS switches' }
  } })
  g.push({ id: 'c-trunk', label: 'Troncal permitiendo la VLAN ' + b.vlan, check: (l) => {
    const lk = linkBetween(l, 'SW1', b.accSw)
    if (!lk) return { ok: false, reason: 'Primero cablea ' + sw1 + ' con ' + accName }
    const v = carriedVlans(l, lk)
    return v.includes(b.vlan) ? true : { ok: false, reason: 'El troncal no transporta la VLAN ' + b.vlan + ' (switchport mode trunk + switchport trunk allowed vlan ' + b.vlan + ' en ambos extremos)' }
  } })
  g.push({ id: 'c-svi', label: 'Gateway de la VLAN en ' + sw1 + ' (' + b.gw + ')', check: (l) => {
    const d = l.devices.SW1
    const name = 'Vlan' + b.vlan
    const i = d.interfaces[name]
    return (i && sviUp(d, name) && i.ip === b.gw) ? true : { ok: false, reason: 'Crea interface ' + name + ' en ' + sw1 + ': ip address ' + b.gw + ' ' + M24 }
  } })
  g.push({ id: 'c-access', label: 'Asignar cada PC a la VLAN ' + b.vlan + ' (puerto access)', check: (l) => accessOk(l, b.pcs, b.accSw, b.vlan) })
  g.push({ id: 'c-cable-pc', label: 'Cablear todos los equipos', check: (l) => allUp(l, b.pcs) })
  g.push({ id: 'c-route', label: 'Ruta de regreso a la VLAN nueva desde ' + spec.names.r1, check: (l) => {
    if (spec.wanDesign === 'ospf') {
      const sw1 = l.devices.SW1
      const ok = sw1.ospf && sw1.ospf.enabled && sw1.ospf.networks.some((nw) => nw.net === b.vnet)
      return ok ? true : { ok: false, reason: 'En ' + spec.names.sw1 + ': router ospf 1 y network ' + b.vnet + ' 0.0.0.255 area 0' }
    }
    const r1 = l.devices.R1
    const ok = (r1.staticRoutes || []).some((r) => r.net === b.vnet && r.mask === M24)
    return ok ? true : { ok: false, reason: 'En ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1 }
  } })
  g.push({ id: 'c-gw', label: 'Cada equipo alcanza su gateway ' + b.gw, check: (l) => allPing(l, pcIds, b.gw) })
  g.push({ id: 'c-lan', label: 'Comunicación con ' + spec.names.pc1 + ' (inter-VLAN)', check: (l) => allPing(l, pcIds, spec.pcs.admin) })
  g.push({ id: 'c-net', label: 'Salida a Internet (' + INTERNET + ')', check: (l) => allPing(l, pcIds, INTERNET) })
  return g
}

function buildHints(spec, b) {
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  return [
    'Trabaja por capas: 1) cableado, 2) VLANs, 3) troncal, 4) gateway (SVI), 5) verificar con ping.',
    'Con el botón 🔌 Cablear une primero el switch de acceso (' + accName + ') con ' + spec.names.sw1 + ' (si aplica) y después cada PC al switch de acceso.',
    'La VLAN ' + b.vlan + ' (' + b.vlanName + ') debe existir en ' + spec.names.sw1 + ' y en ' + accName + '. Comando: vlan ' + b.vlan + '.',
    b.template === 'building'
      ? 'El enlace entre switches debe ser troncal y permitir la VLAN: switchport mode trunk y switchport trunk allowed vlan ' + b.vlan + '.'
      : 'El troncal ' + spec.names.sw1 + ' ↔ ' + accName + ' ya existe: agrega la VLAN con switchport trunk allowed vlan add ' + b.vlan + ' en AMBOS extremos.',
    'El gateway vive en ' + spec.names.sw1 + ' como SVI: interface Vlan' + b.vlan + ' con ip address ' + b.gw + ' ' + M24 + '.',
    'Cada PC debe ir a un puerto access de la VLAN ' + b.vlan + '. Verifica con show vlan brief, show interfaces trunk y ping.',
    spec.wanDesign === 'ospf'
      ? 'Para que salgan a Internet, ' + spec.names.sw1 + ' debe anunciar la red nueva por OSPF: router ospf 1 → network ' + b.vnet + ' 0.0.0.255 area 0.'
      : 'Para que salgan a Internet, ' + spec.names.r1 + ' necesita la ruta de regreso a ' + b.vnet + '/24: ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1 + '.',
  ]
}

function buildSolution(spec, b) {
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  const trunkCmd = b.template === 'building'
    ? ['    switchport mode trunk', '    switchport trunk allowed vlan ' + b.vlan]
    : ['    switchport trunk allowed vlan add ' + b.vlan]
  const s = []
  s.push('PASO 1 — Cableado (botón 🔌 Cablear del panel superior):')
  if (b.template === 'building') s.push('  • Une ' + spec.names.sw1 + ' con ' + accName + ' (elige un puerto libre en cada switch).')
  s.push('  • Une cada PC a un puerto libre de ' + accName + '.')
  s.push('')
  s.push('PASO 2 — VLAN en ambos switches:')
  s.push('  En ' + spec.names.sw1 + ' y en ' + accName + ':')
  s.push('    enable'); s.push('    configure terminal'); s.push('    vlan ' + b.vlan); s.push('    name ' + b.vlanName); s.push('    end')
  s.push('')
  s.push('PASO 3 — Troncal (permitir la VLAN ' + b.vlan + '):')
  s.push('  En ' + accName + ' (y en ' + spec.names.sw1 + '):')
  s.push('    interface <puerto troncal>'); s.push(...trunkCmd); s.push('    end')
  s.push('')
  s.push('PASO 4 — Puertos de acceso de los PC en ' + accName + ':')
  s.push('    interface <puerto de cada PC>'); s.push('    switchport mode access'); s.push('    switchport access vlan ' + b.vlan); s.push('    end')
  s.push('')
  s.push('PASO 5 — Gateway (SVI) en ' + spec.names.sw1 + ':')
  s.push('    interface Vlan' + b.vlan); s.push('    ip address ' + b.gw + ' ' + M24); s.push('    end')
  s.push('')
  s.push('PASO 6 — Ruta de regreso para Internet:')
  if (spec.wanDesign === 'ospf') {
    s.push('  En ' + spec.names.sw1 + ': router ospf 1 y network ' + b.vnet + ' 0.0.0.255 area 0')
  } else {
    s.push('  En ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1)
  }
  s.push('')
  s.push('Verifica: show vlan brief · show interfaces trunk · show ip interface brief · ping ' + b.gw)
  return s
}
