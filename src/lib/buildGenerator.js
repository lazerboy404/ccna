// Generador de laboratorios de CONSTRUCCIÓN: topología variable (edificio/piso/área WiFi),
// equipos finales (PC, servidor, cámara, laptop) y una VLAN nueva por crear.
// El usuario cablea con clic y configura por CLI (VLANs, troncal, access, SVI, ssid, rutas).
import { mulberry32, M24, INTERNET, isSwitch, isEndpoint } from './utils.js'
import { generateSpec, buildDevices, buildLinks, TOPO_ORDER } from './labGenerator.js'
import { recompute, sviUp, pcUp, linkBetween, carriedVlans, positionsFor, allPing } from './engine.js'

const BUILDINGS = ['Edificio B', 'Planta Alta', 'Bodega Norte', 'Ala Este', 'Edificio de Contabilidad', 'Planta de Produccion', 'Modulo Aeropuerto', 'Almacen Central', 'Edificio de TI', 'Sucursal Sur']
const AREAS = [['RRHH', 'RECURSOS HUMANOS'], ['CONTA', 'CONTABILIDAD'], ['INVITADOS', 'INVITADOS'], ['OPER', 'OPERACIONES'], ['LAB', 'LABORATORIO'], ['WIFI', 'WIFI-CORP'], ['CCTV', 'CAMARAS'], ['PRINT', 'IMPRESORAS'], ['ALMACEN', 'ALMACEN'], ['NOMINA', 'NOMINA']]
const PC_NAMES = ['PC-RRHH', 'PC-NOMINA', 'PC-COMPRAS', 'PC-ALMACEN', 'PC-RECEP', 'PC-CALIDAD', 'PC-LOGISTICA', 'PC-CONTA2', 'PC-MKT', 'PC-OPER', 'PC-LAB', 'PC-BODEGA']
const SERVER_NAMES = ['SRV-APP', 'SRV-DB', 'SRV-FILE', 'SRV-MAIL', 'SRV-CCTV', 'SRV-ERP']
const CAMERA_NAMES = ['CAM-ENTRADA', 'CAM-PASILLO', 'CAM-ALMACEN', 'CAM-OFICINA', 'CAM-ESTACION', 'CAM-MUELLE', 'CAM-RACK']
const VLAN_POOL = [50, 60, 70, 80, 90, 100, 110, 120, 150, 160, 170, 180, 190, 200]

const port = (vlan, desc) => ({ kind: 'port', mode: 'access', accessVlan: vlan == null ? 1 : vlan, allowed: [], nativeVlan: 1, encap: 'dot1q', status: 'up', desc: desc || '' })
const addPorts = (d, names) => { for (const n of names) if (!d.interfaces[n]) d.interfaces[n] = port(1, 'Puerto disponible') }
const ensureVlan1 = (d) => { if (d.vlans) d.vlans[1] = d.vlans[1] || 'default' }
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)]
const shuffle = (rnd, a) => a.slice().sort(() => rnd() - 0.5)

export function generateConstructionLab(seed, sc) {
  const rnd = mulberry32((seed >>> 0) ^ 0x1b2c3d4e)
  const spec = generateSpec(seed >>> 0, sc)
  spec.topo.sw3 = false
  const template = sc.template || 'building'
  const used = [99, spec.va, spec.vv, spec.vs]
  const vlan = pick(rnd, VLAN_POOL.filter((v) => !used.includes(v)))
  const [areaKey, areaName] = pick(rnd, AREAS)
  const building = pick(rnd, BUILDINGS)
  const octet = spec.B + 1 + Math.floor(rnd() * 15)
  const vnet = '10.' + octet + '.' + vlan + '.0'
  const gw = '10.' + octet + '.' + vlan + '.1'
  const accSw = template === 'building' ? 'SWB' : 'SW2'
  const swName = template === 'building' ? 'SW-' + areaKey : spec.names.sw2

  const devices = buildDevices(spec)
  for (const d of Object.values(devices)) if (isSwitch(d)) ensureVlan1(d)
  addPorts(devices.SW1, ['Gi0/5', 'Gi0/6', 'Gi0/7', 'Gi0/8'])
  addPorts(devices.SW2, ['Gi0/4', 'Gi0/5', 'Gi0/6', 'Gi0/7', 'Gi0/8', 'Gi0/9', 'Gi0/10', 'Gi0/11', 'Gi0/12'])

  const nEnd = template === 'wifi' ? 2 : 3 + Math.floor(rnd() * 4)
  const endpoints = []
  const usedNames = new Set()
  for (let i = 0; i < nEnd; i++) {
    const ip = '10.' + octet + '.' + vlan + '.' + (10 + i)
    let type = 'pc'
    if (template !== 'wifi') {
      const r = rnd()
      type = r < 0.6 ? 'pc' : (r < 0.85 ? 'camera' : 'server')
    }
    const pool = type === 'server' ? SERVER_NAMES : (type === 'camera' ? CAMERA_NAMES : PC_NAMES)
    let name = pick(rnd, pool)
    while (usedNames.has(name)) name = pick(rnd, pool) + '-' + (i + 1)
    usedNames.add(name)
    const id = (type === 'server' ? 'SRV' : type === 'camera' ? 'CAM' : template === 'wifi' ? 'LAP' : 'PCB') + (i + 1)
    const isWifi = template === 'wifi'
    const dev = { id, name, type: isWifi ? 'wireless' : type, role: building + ' (' + areaName + ') · ' + (type === 'server' ? 'Servidor' : type === 'camera' ? 'Cámara IP' : isWifi ? 'Laptop WiFi' : 'PC'), interfaces: {}, pc: { ip, mask: M24, gw } }
    if (isWifi) dev.pc.ssid = 'CORP'
    devices[id] = dev
    endpoints.push({ id, name, ip, type: dev.type })
  }

  const links = buildLinks(spec)
  if (template === 'building') {
    devices.SWB = switchDev('SWB', swName, 'Switch de acceso (' + building + ')')
  }
  if (template === 'wifi') {
    devices.SWB = switchDev('SWB', 'SW-' + areaKey, 'Switch de acceso (' + building + ')')
    devices.AP1 = {
      id: 'AP1', name: 'AP-' + areaKey, type: 'ap', role: 'Access Point (' + building + ')',
      vlans: { 1: 'default' }, interfaces: { 'Gi0/0': port(1, 'Uplink al switch') },
      ssids: [], stp: {}, portfast: {}, staticRoutes: [], ospf: null,
    }
    for (const e of endpoints) links.push({ id: 'LW-' + e.id, a: { dev: 'AP1' }, b: { dev: e.id }, kind: 'wifi', label: 'WiFi CORP' })
  }

  const order = TOPO_ORDER.filter((id) => !!devices[id])
  if (template === 'building' || template === 'wifi') order.push('SWB')
  if (template === 'wifi') order.push('AP1')
  order.push(...endpoints.map((p) => p.id))

  const positions = Object.assign({}, positionsFor(spec))
  if (template === 'wifi') {
    positions.SWB = { x: 340, y: 585 }
    positions.AP1 = { x: 700, y: 585 }
    const lx = [600, 800]
    endpoints.forEach((p, i) => { positions[p.id] = { x: lx[i % 2], y: 700 } })
  } else {
    if (template === 'building') positions.SWB = { x: 480, y: 585 }
    endpoints.forEach((p, i) => { positions[p.id] = { x: 480 + (i - (endpoints.length - 1) / 2) * 150, y: 690 } })
  }

  const bb = { template, vlan, vlanName: areaName, vnet, gw, accSw, swId: 'SWB', swName, endpoints, ssid: 'CORP' }
  const goals = template === 'wifi' ? wifiGoals(spec, bb) : buildGoalsFrom(spec, bb)
  const build = Object.assign({}, bb, {
    building, area: areaName, pcs: endpoints,
    hints: template === 'wifi' ? wifiHints(spec, bb) : buildHints(spec, bb),
    solution: template === 'wifi' ? wifiSolution(spec, bb) : buildSolution(spec, bb),
  })
  spec.build = build
  const lab = {
    mode: 'build', spec, scenario: sc, devices, links, order, positions,
    viewBox: '0 0 960 780',
    faults: [], goals, build,
    hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null,
  }
  recompute(lab)
  return lab
}

function switchDev(id, name, role) {
  return {
    id, name, type: 'l2switch', role,
    vlans: { 1: 'default' }, interfaces: {
      'Gi0/1': port(1, 'Uplink al core (troncal)'), 'Gi0/2': port(1, 'Acceso'), 'Gi0/3': port(1, 'Acceso'),
      'Gi0/4': port(1, 'Acceso'), 'Gi0/5': port(1, 'Acceso'), 'Gi0/6': port(1, 'Acceso'),
      'Gi0/7': port(1, 'Acceso'), 'Gi0/8': port(1, 'Acceso'),
    },
    stp: {}, portfast: {}, staticRoutes: [], ospf: null,
  }
}

function pcSwitchPort(lab, pcId) {
  const lk = lab.links.find((x) => x.a.dev === pcId || x.b.dev === pcId)
  if (!lk || lk.kind === 'wifi') return null
  const sw = lk.a.dev === pcId ? lk.b : lk.a
  return sw.port ? { dev: sw.dev, port: sw.port } : null
}
function accessOk(lab, list, accSw, vlan) {
  for (const p of list) {
    const sp = pcSwitchPort(lab, p.id)
    if (!sp || sp.dev !== accSw) return { ok: false, reason: p.name + ' no está conectado a ' + (lab.devices[accSw] ? lab.devices[accSw].name : accSw) }
    const i = lab.devices[sp.dev].interfaces[sp.port]
    if (!i || i.mode !== 'access' || i.accessVlan !== vlan) return { ok: false, reason: p.name + ': el puerto ' + sp.port + ' debe estar en access vlan ' + vlan }
  }
  return { ok: true }
}
function allUp(lab, list) {
  for (const p of list) if (!pcUp(lab, p.id)) return { ok: false, reason: p.name + ' no tiene enlace (cable o VLAN del puerto)' }
  return { ok: true }
}
const vlanBoth = (l, vlan, ids) => ids.every((id) => l.devices[id] && l.devices[id].vlans && l.devices[id].vlans[vlan])
const sviGoal = (spec, b) => ({ id: 'c-svi', label: 'Gateway de la VLAN en ' + spec.names.sw1 + ' (' + b.gw + ')', check: (l) => {
  const d = l.devices.SW1, name = 'Vlan' + b.vlan, i = d.interfaces[name]
  return (i && sviUp(d, name) && i.ip === b.gw) ? true : { ok: false, reason: 'Crea interface ' + name + ' en ' + spec.names.sw1 + ': ip address ' + b.gw + ' ' + M24 }
} })
const routeGoal = (spec, b) => ({ id: 'c-route', label: 'Ruta de regreso a la VLAN nueva desde ' + spec.names.r1, check: (l) => {
  if (spec.wanDesign === 'ospf') {
    const sw1 = l.devices.SW1
    const ok = sw1.ospf && sw1.ospf.enabled && sw1.ospf.networks.some((nw) => nw.net === b.vnet)
    return ok ? true : { ok: false, reason: 'En ' + spec.names.sw1 + ': router ospf 1 y network ' + b.vnet + ' 0.0.0.255 area 0' }
  }
  const ok = (l.devices.R1.staticRoutes || []).some((r) => r.net === b.vnet && r.mask === M24)
  return ok ? true : { ok: false, reason: 'En ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1 }
} })
const pingGoals = (spec, b) => {
  const ids = b.endpoints.map((p) => p.id)
  return [
    { id: 'c-gw', label: 'Cada equipo alcanza su gateway ' + b.gw, check: (l) => allPing(l, ids, b.gw) },
    { id: 'c-lan', label: 'Comunicación con ' + spec.names.pc1 + ' (inter-VLAN)', check: (l) => allPing(l, ids, spec.pcs.admin) },
    { id: 'c-net', label: 'Salida a Internet (' + INTERNET + ')', check: (l) => allPing(l, ids, INTERNET) },
  ]
}

function buildGoalsFrom(spec, b) {
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  const g = []
  if (b.template === 'building') {
    g.push({ id: 'c-cable', label: 'Cablear ' + spec.names.sw1 + ' ↔ ' + accName, check: (l) => linkBetween(l, 'SW1', b.swId) ? true : { ok: false, reason: 'No hay ningún cable entre ' + spec.names.sw1 + ' y ' + accName + ' (usa el botón 🔌 Cablear)' } })
  }
  g.push({ id: 'c-vlan', label: 'Crear la VLAN ' + b.vlan + ' (' + b.vlanName + ') en ' + spec.names.sw1 + ' y ' + accName, check: (l) => {
    const a = l.devices.SW1.vlans && l.devices.SW1.vlans[b.vlan]
    const c = l.devices[b.accSw].vlans && l.devices[b.accSw].vlans[b.vlan]
    return (a && c) ? true : { ok: false, reason: 'Falta la VLAN ' + b.vlan + ' en ' + (!a ? spec.names.sw1 : accName) + ' (comando: vlan ' + b.vlan + ') en AMBOS switches' }
  } })
  g.push({ id: 'c-trunk', label: 'Troncal permitiendo la VLAN ' + b.vlan, check: (l) => {
    const lk = linkBetween(l, 'SW1', b.accSw)
    if (!lk) return { ok: false, reason: 'Primero cablea ' + spec.names.sw1 + ' con ' + accName }
    return carriedVlans(l, lk).includes(b.vlan) ? true : { ok: false, reason: 'El troncal no transporta la VLAN ' + b.vlan + ' (switchport mode trunk + allowed vlan en ambos extremos)' }
  } })
  g.push(sviGoal(spec, b), routeGoal(spec, b))
  g.push({ id: 'c-access', label: 'Asignar cada equipo a la VLAN ' + b.vlan + ' (puerto access)', check: (l) => accessOk(l, b.endpoints, b.accSw, b.vlan) })
  g.push({ id: 'c-cable-pc', label: 'Cablear todos los equipos', check: (l) => allUp(l, b.endpoints) })
  g.push(...pingGoals(spec, b))
  return g
}

function wifiGoals(spec, b) {
  const g = [
    { id: 'w-cable', label: 'Cablear ' + spec.names.sw1 + ' ↔ ' + b.swName, check: (l) => linkBetween(l, 'SW1', 'SWB') ? true : { ok: false, reason: 'Conecta el switch del área con el core (botón 🔌)' } },
    { id: 'w-apcable', label: 'Cablear ' + b.swName + ' ↔ AP', check: (l) => linkBetween(l, 'SWB', 'AP1') ? true : { ok: false, reason: 'Conecta el Access Point a un puerto libre del switch' } },
    { id: 'w-vlan', label: 'Crear la VLAN ' + b.vlan + ' (' + b.vlanName + ') en ' + spec.names.sw1 + ' y ' + b.swName, check: (l) => vlanBoth(l, b.vlan, ['SW1', 'SWB']) ? true : { ok: false, reason: 'Crea la VLAN ' + b.vlan + ' en AMBOS switches (comando: vlan ' + b.vlan + ')' } },
    { id: 'w-trunk', label: 'Troncal ' + spec.names.sw1 + '↔' + b.swName + ' permitiendo la VLAN ' + b.vlan, check: (l) => {
      const lk = linkBetween(l, 'SW1', 'SWB')
      if (!lk) return { ok: false, reason: 'Primero cablea los switches' }
      return carriedVlans(l, lk).includes(b.vlan) ? true : { ok: false, reason: 'Configura switchport mode trunk y allowed vlan ' + b.vlan + ' en ambos extremos' }
    } },
    { id: 'w-aptrunk', label: 'Troncal ' + b.swName + '↔AP permitiendo la VLAN ' + b.vlan, check: (l) => {
      const lk = linkBetween(l, 'SWB', 'AP1')
      if (!lk) return { ok: false, reason: 'Primero cablea el AP' }
      return carriedVlans(l, lk).includes(b.vlan) ? true : { ok: false, reason: 'El puerto del switch hacia el AP debe ser troncal con allowed vlan ' + b.vlan }
    } },
    { id: 'w-ssid', label: 'SSID CORP en el AP mapeado a la VLAN ' + b.vlan, check: (l) => {
      const ap = l.devices.AP1
      return (ap.ssids || []).some((s) => s.vlan === b.vlan) ? true : { ok: false, reason: 'En el AP ejecuta: ssid CORP vlan ' + b.vlan }
    } },
    sviGoal(spec, b), routeGoal(spec, b),
  ]
  g.push(...pingGoals(spec, b))
  return g
}

function trunkCmd(b) {
  return b.template === 'building' || b.template === 'wifi'
    ? ['    switchport mode trunk', '    switchport trunk allowed vlan ' + b.vlan]
    : ['    switchport trunk allowed vlan add ' + b.vlan]
}

function buildHints(spec, b) {
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  return [
    'Trabaja por capas: 1) cableado, 2) VLANs, 3) troncal, 4) gateway (SVI), 5) verificar con ping.',
    'Con el botón 🔌 Cablear une el switch de acceso (' + accName + ') con ' + spec.names.sw1 + ' y después cada equipo al switch de acceso.',
    'La VLAN ' + b.vlan + ' (' + b.vlanName + ') debe existir en ' + spec.names.sw1 + ' y en ' + accName + ' (comando: vlan ' + b.vlan + ').',
    b.template === 'building'
      ? 'El enlace entre switches debe ser troncal y permitir la VLAN: switchport mode trunk y switchport trunk allowed vlan ' + b.vlan + '.'
      : 'El troncal ' + spec.names.sw1 + ' ↔ ' + accName + ' ya existe: agrega la VLAN con switchport trunk allowed vlan add ' + b.vlan + ' en AMBOS extremos.',
    'El gateway vive en ' + spec.names.sw1 + ' como SVI: interface Vlan' + b.vlan + ' con ip address ' + b.gw + ' ' + M24 + '.',
    'Cada equipo debe ir a un puerto access de la VLAN ' + b.vlan + '. Verifica con show vlan brief y ping.',
    spec.wanDesign === 'ospf'
      ? 'Para Internet, ' + spec.names.sw1 + ' debe anunciar la red: router ospf 1 → network ' + b.vnet + ' 0.0.0.255 area 0.'
      : 'Para Internet, ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1 + '.',
  ]
}

function wifiHints(spec, b) {
  return [
    'Este ejercicio es 100% inalámbrico: los clientes no se cablean, se asocian al AP por el SSID.',
    'Cablea ' + spec.names.sw1 + ' ↔ ' + b.swName + ' y ' + b.swName + ' ↔ AP (botón 🔌).',
    'Crea la VLAN ' + b.vlan + ' en ' + spec.names.sw1 + ' y ' + b.swName + ' (vlan ' + b.vlan + ').',
    'Deja el troncal ' + spec.names.sw1 + '↔' + b.swName + ' y el puerto ' + b.swName + '↔AP como troncal permitiendo la VLAN ' + b.vlan + '.',
    'En el AP mapea el SSID con VLAN: ssid CORP vlan ' + b.vlan + ' (esto pone su uplink en troncal).',
    'El gateway es la SVI en ' + spec.names.sw1 + ': interface Vlan' + b.vlan + ' con ' + b.gw + ' ' + M24 + '.',
    spec.wanDesign === 'ospf'
      ? 'Para Internet, anuncia la red en OSPF: network ' + b.vnet + ' 0.0.0.255 area 0.'
      : 'Para Internet, ruta en ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1 + '.',
  ]
}

function commonSteps(spec, b, accName) {
  return [
    'PASO 2 — VLAN en ambos switches: en ' + spec.names.sw1 + ' y en ' + accName + ':',
    '    enable', '    configure terminal', '    vlan ' + b.vlan, '    name ' + b.vlanName, '    end', '',
    'PASO 3 — Troncal ' + spec.names.sw1 + '↔' + accName + ' (permitir la VLAN ' + b.vlan + '):',
    '    interface <puerto troncal>', ...trunkCmd(b), '    end', '',
    'PASO 4 — Gateway (SVI) en ' + spec.names.sw1 + ':',
    '    interface Vlan' + b.vlan, '    ip address ' + b.gw + ' ' + M24, '    end', '',
    'PASO 5 — Ruta de regreso para Internet:',
    spec.wanDesign === 'ospf'
      ? '    En ' + spec.names.sw1 + ': router ospf 1 y network ' + b.vnet + ' 0.0.0.255 area 0'
      : '    En ' + spec.names.r1 + ': ip route ' + b.vnet + ' ' + M24 + ' ' + spec.nets.transit.sw1, '',
  ]
}

function buildSolution(spec, b) {
  const accName = b.template === 'building' ? b.swName : spec.names.sw2
  const s = []
  s.push('PASO 1 — Cableado (botón 🔌):')
  if (b.template === 'building') s.push('  • Une ' + spec.names.sw1 + ' con ' + accName + '.')
  s.push('  • Une cada equipo (PC/servidor/cámara) a un puerto libre de ' + accName + '.', '')
  s.push(...commonSteps(spec, b, accName))
  s.push('PASO 6 — Puertos de acceso de los equipos en ' + accName + ':')
  s.push('    interface <puerto de cada equipo>'); s.push('    switchport mode access'); s.push('    switchport access vlan ' + b.vlan); s.push('    end', '')
  s.push('Verifica: show vlan brief · show interfaces trunk · ping ' + b.gw)
  return s
}

function wifiSolution(spec, b) {
  const s = []
  s.push('PASO 1 — Cableado (botón 🔌): ' + spec.names.sw1 + ' ↔ ' + b.swName + ' y ' + b.swName + ' ↔ AP.', '')
  s.push(...commonSteps(spec, b, b.swName))
  s.push('PASO 4b — Troncal ' + b.swName + '↔AP (permitir la VLAN ' + b.vlan + '):')
  s.push('    En ' + b.swName + ': interface <puerto hacia el AP>'); s.push('    switchport mode trunk'); s.push('    switchport trunk allowed vlan ' + b.vlan); s.push('    end', '')
  s.push('PASO 6 — SSID en el AP:')
  s.push('    En el AP: enable → configure terminal → ssid CORP vlan ' + b.vlan + ' → end')
  s.push('    (esto pone el uplink Gi0/0 del AP en troncal y permite la VLAN).', '')
  s.push('Las laptops se asocian solas. Verifica: show wlan · ping ' + b.gw)
  return s
}
