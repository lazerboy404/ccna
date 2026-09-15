// Generador de laboratorios: escenarios reales, dispositivos, enlaces, objetivos y catálogo de fallas
import { mulberry32, M24, M30, M16, M0, INTERNET } from './utils.js'

export const TOPO_ORDER = ['ISP', 'FW1', 'R1', 'SW1', 'SW2', 'SW3', 'PC1', 'PC2', 'PC3', 'PC4']

const SITES = ['Monterrey', 'Guadalajara', 'CDMX', 'Puebla', 'Tijuana', 'Merida', 'Queretaro', 'Leon', 'Cancun', 'Toluca']
const TECHS = ['Ana Torres', 'Luis Gomez', 'Maria Ruiz', 'Carlos Diaz', 'Sofia Vera', 'Diego Rios', 'Paula Mendez']
const PRIOS = ['Alta', 'Media', 'Crítica']

export const SCENARIOS = [
  { key: 'b-cable', diff: 'Básico', title: 'El cable muerto', design: null, sw3: null, faultKeys: ['shut-pc2'],
    story: s => '«Buenos días, la PC de Ventas (' + s.names.pc2 + ') amaneció sin red: Windows dice "cable desconectado" y el foquito del puerto está apagado. El resto del piso trabaja normal.» — Recepción' },
  { key: 'b-troncal', diff: 'Básico', title: 'Medio piso muerto', design: null, sw3: null, faultKeys: ['shut-trunk'],
    story: s => '«Desde que movieron los cables del site por la limpieza, Ventas y Soporte no tienen red de ningún tipo. Los de Admin (que están en el core) sí trabajan.» — Soporte de TI' },
  { key: 'b-ip-manual', diff: 'Básico', title: 'La IP que alguien tocó', design: null, sw3: null, faultKeys: ['wrong-pc-ip'],
    story: s => '«Ayer le puse IP manual a mi PC para "arreglar un candado" y desde entonces no entro a nada: ni a la intranet ni a internet. Mi compañero de al lado sí trabaja.» — Ana, Ventas' },
  { key: 'b-transito', diff: 'Básico', title: 'Red local sin salida', design: null, sw3: null, faultKeys: ['shut-transit'],
    story: s => '«Reporte general de la sucursal: entre oficinas y carpetas compartidas todo funciona, pero nadie abre páginas ni correo. Pasa en todas las áreas por igual.» — Gerencia' },
  { key: 'b-vlan-fantasma', diff: 'Básico', title: 'El switch que olvidó una VLAN', design: null, sw3: null, faultKeys: ['missing-vlan'],
    story: s => '«Hubo un apagón, reiniciaron el switch de acceso y desde entonces la gente de Soporte está muerta: el cable está conectado pero el puerto del switch no prende en verde.» — Soporte de TI' },
  { key: 'i-gateway-fantasma', diff: 'Intermedio', title: 'El gateway fantasma', design: null, sw3: null, faultKeys: ['wrong-svi'],
    story: s => '«Todo Ventas dice que tiene cable e IP correcta, pero no sale nada: el ping a su gateway (' + s.nets.ventas.gw + ') no responde. Admin y Soporte trabajan sin problema.» — Jefe de Ventas' },
  { key: 'i-usuario-solitario', diff: 'Intermedio', title: 'El usuario solitario', design: null, sw3: null, faultKeys: ['wrong-access-vlan'],
    story: s => '«Un solo usuario se queja (Soporte): "mi PC prende y tiene IP correcta, pero no alcanzo nada, ni al de al lado". Su compañero de Ventas, conectado al MISMO switch, funciona perfecto.» — Mesa de ayuda' },
  { key: 'i-loop', diff: 'Intermedio', title: 'El loop del viernes', design: null, sw3: null, faultKeys: ['stp-block'],
    story: s => '«Alguien conectó un switch viejo en cascada "para tener más puertos" y la red del piso se cayó. Ya desconectaron el switchcito, pero el troncal sigue sin pasar tráfico y hay un LED ámbar en el switch.» — Soporte de TI' },
  { key: 'i-soporte-sin-net', diff: 'Intermedio', title: 'Navegar a medias', design: 'static', sw3: null, faultKeys: ['missing-static-route'],
    story: s => '«La gente de Soporte reporta: "en la red local todo bien, hasta imprimimos, pero internet no abre nada, ni sale el ping". Ventas y Admin navegan sin problema.» — Soporte de TI' },
  { key: 'i-puerta-perdida', diff: 'Intermedio', title: 'Se fue la puerta', design: 'static', sw3: null, faultKeys: ['missing-default-sw1'],
    story: s => '«Queja general: la red interna vuela (ping entre áreas OK) pero no sale ni un solo ping a internet en NINGUNA área. El módem del ISP tiene sus luces normales.» — Gerencia' },
  { key: 'i-ospf-mudo', diff: 'Intermedio', title: 'Rutas que no se hablan', design: 'ospf', sw3: null, faultKeys: ['ospf-down'],
    story: s => '«Después del mantenimiento nocturno del core, toda la sucursal perdió internet aunque la red local funciona. Aquí el ruteo dinámico entre router y switch L3 es OSPF área 0.» — Soporte de TI' },
  { key: 'a-turno-nocturno', diff: 'Avanzado', title: 'Turno nocturno', design: null, sw3: null, faultKeys: ['shut-transit', 'wrong-access-vlan'],
    story: s => '«El turno de noche "reconfiguró" varias cosas. Reporte mixto del lunes: NINGÚN área tiene internet; Admin y Ventas sí se ven en red local; y Soporte no tiene absolutamente nada. Dos problemas distintos se encimaron: diagnostica por capas.» — Gerencia' },
  { key: 'a-tecnico-externo', diff: 'Avanzado', title: 'El técnico externo', design: null, sw3: null, faultKeys: ['trunk-mode', 'missing-vlan'],
    story: s => '«Vino un técnico externo a "ordenar" el switch de acceso y ahora Ventas y Soporte están completamente muertos; solo Admin (que vive en el core) trabaja. El enlace entre switches se ve raro.» — Soporte de TI' },
  { key: 'a-doble-reporte', diff: 'Avanzado', title: 'Doble reporte confuso', design: null, sw3: null, faultKeys: ['stp-block', 'wrong-pc-ip'],
    story: s => '«Primero se cayó todo el piso de abajo por un loop; cuando el troncal revivió, la PC de Ventas siguió sin dar ping a su gateway — dicen que alguien le dejó IP manual rara durante el caos. Dos fallas en dos capas distintas.» — Mesa de ayuda' },
  { key: 'a-planta-nueva', diff: 'Avanzado', title: 'La planta nueva', design: null, sw3: true, faultKeys: ['shut-sw3trunk', 'wrong-access-vlan'],
    story: s => '«Contabilidad (planta nueva, switch recién agregado) perdió TODA su red de golpe. Y aparte, el de Soporte dice que su PC tiene IP correcta pero no alcanza nada. Ventas y Admin trabajan bien.» — Gerencia' },
  { key: 'a-lunes-negro', diff: 'Avanzado', title: 'Lunes negro', design: null, sw3: null, faultKeys: ['shut-pc2', 'wrong-svi', 'trunk-allowed'],
    story: s => '«Tres tickets el mismo lunes: (1) una PC de Ventas sin enlace, (2) todo Ventas sin alcanzar su gateway, (3) Soporte aislado del resto. Admin opera sin problema. Prioridad crítica.» — Mesa de ayuda' },
  { key: 'i-acl', diff: 'Intermedio', title: 'La regla que sobra', design: null, sw3: null, faultKeys: ['acl-block'],
    story: s => '«Soporte no tiene internet desde que "endurecieron" la seguridad, pero Ventas y Admin navegan normal y la red local de Soporte funciona. El enlace está en verde: parece un filtro, no una falla física.» — Mesa de ayuda' },
  { key: 'i-portsecurity', diff: 'Intermedio', title: 'El puerto castigado', design: null, sw3: null, faultKeys: ['port-security'],
    story: s => '«La PC de Soporte amaneció sin cable según Windows, pero el cable está conectado. Ayer movieron equipos de lugar y el switch muestra el puerto en un estado raro.» — Soporte de TI' },
  { key: 'a-seguridad', diff: 'Avanzado', title: 'Candados mal puestos', design: null, sw3: null, faultKeys: ['acl-block', 'port-security'],
    story: s => '«El equipo de seguridad aplicó políticas nuevas y Soporte quedó aislado por dos frentes: su PC sin enlace y sin salida a Internet, mientras Ventas y Admin trabajan. Diagnostica por capas.» — Gerencia' },
  { key: 'c-edificio', diff: 'Básico', build: true, template: 'building', title: 'El edificio nuevo', design: null, sw3: null, faultKeys: null,
    story: s => '«Acabamos de habilitar ' + s.build.building + ' y necesitamos ' + s.build.pcs.length + ' equipos de ' + s.build.area + ' con red. Llegó un switch de acceso nuevo sin configurar y todavía no existe la VLAN ' + s.build.vlan + ' (' + s.build.vlanName + '). Cablea todo y deja el gateway en ' + s.names.sw1 + '.» — TI' },
  { key: 'c-piso', diff: 'Intermedio', build: true, template: 'floor', title: 'Ampliación de piso', design: null, sw3: null, faultKeys: null,
    story: s => '«Remodelamos el piso y sumamos ' + s.build.pcs.length + ' puestos de ' + s.build.area + '. Ya hay switch con puertos libres, pero hay que cablear los equipos y crear la VLAN ' + s.build.vlan + ' (' + s.build.vlanName + ') con su gateway en ' + s.names.sw1 + '. El resto de la red ya funciona.» — Gerencia' },
  { key: 'c-edificio-avz', diff: 'Avanzado', build: true, template: 'building', title: 'Puesta en marcha del edificio', design: null, sw3: null, faultKeys: null,
    story: s => '«Día uno de ' + s.build.building + ': ' + s.build.pcs.length + ' estaciones de ' + s.build.area + ' y un switch nuevo listos para instalar. Diseña y monta la VLAN ' + s.build.vlan + ' (' + s.build.vlanName + ') completa: cableado, troncal, puertos de acceso y gateway en ' + s.names.sw1 + '. Que TODO quede navegando.» — Dirección' },
  { key: 'sorpresa', diff: 'Mixto', title: 'Incidente sin clasificar', design: null, sw3: null, faultKeys: null,
    story: s => '«La red "no sirve bien" — dice el cliente. Hay varios reportes sueltos y nadie sabe por dónde empezar. Lee los síntomas del ticket y diagnostica desde la capa física hacia arriba.» — Mesa de ayuda' },
]

export function pickScenario(rnd, pref) {
  let pool = SCENARIOS
  if (pref && pref !== 'any') {
    const f = SCENARIOS.filter((sc) => sc.diff === pref)
    if (f.length) pool = f
  }
  return pool[Math.floor(rnd() * pool.length)]
}

export function generateSpec(seed, sc) {
  const rnd = mulberry32(seed >>> 0)
  const R = (n) => Math.floor(rnd() * n)
  const pick = (a) => a[R(a.length)]
  const site = pick(SITES)
  const B = 16 + R(200)
  const all = [10, 15, 100, 110, 105]
  const va = pick(all)
  let vv = pick([20, 25, 200, 120]); if (vv === va) vv = 20
  let vs = pick([30, 35, 300, 130]); if (vs === va || vs === vv) vs = 30
  const vc = pick([40, 45, 140])
  const fw = rnd() < 0.75
  const sw3 = (sc && sc.sw3 === true) ? true : (rnd() < 0.35)
  const wanDesign = (sc && sc.design) ? sc.design : (rnd() < 0.5 ? 'static' : 'ospf')
  const w1 = 4 + 4 * R(50)
  const w2 = w1 + 4 + 4 * R(8)
  return {
    seed: seed >>> 0, site, B, va, vv, vs, vc, transit: 99, wanDesign,
    topo: { fw, sw3 },
    ticket: { id: 'TK-' + (1000 + R(9000)), tech: pick(TECHS), prio: pick(PRIOS) },
    names: { isp: 'INTERNET (ISP)', fw: 'FW-' + site, r1: 'R1-' + site, sw1: 'SW1-CORE-' + site, sw2: 'SW2-ACC-' + site, sw3: 'SW3-CONTAB-' + site, pc1: 'PC-ADMIN', pc2: 'PC-VENTAS', pc3: 'PC-SOPORTE', pc4: 'PC-CONTAB' },
    nets: {
      admin: { net: '10.' + B + '.10.0', gw: '10.' + B + '.10.1' },
      ventas: { net: '10.' + B + '.20.0', gw: '10.' + B + '.20.1' },
      soporte: { net: '10.' + B + '.30.0', gw: '10.' + B + '.30.1' },
      contab: { net: '10.' + B + '.40.0', gw: '10.' + B + '.40.1' },
      transit: { net: '10.' + B + '.99.0', r1: '10.' + B + '.99.1', sw1: '10.' + B + '.99.2' },
    },
    pcs: { admin: '10.' + B + '.10.10', ventas: '10.' + B + '.20.10', soporte: '10.' + B + '.30.10', contab: '10.' + B + '.40.10' },
    wan: fw
      ? { fw: true, ispNet: '203.0.113.' + w1, ispIp: '203.0.113.' + (w1 + 1), fwWanIp: '203.0.113.' + (w1 + 2), r1fwNet: '203.0.113.' + w2, r1WanIp: '203.0.113.' + (w2 + 1), fwLanIp: '203.0.113.' + (w2 + 2) }
      : { fw: false, ispNet: '203.0.113.' + w1, ispIp: '203.0.113.' + (w1 + 1), r1WanIp: '203.0.113.' + (w1 + 2) },
  }
}

const rif = (ip, mask, desc) => ({ kind: 'routed', ip, mask, status: 'up', desc: desc || '' })
const rport = (mode, vlan, allowed, desc) => ({ kind: 'port', mode, accessVlan: vlan !== undefined ? vlan : null, allowed: allowed || [], status: 'up', desc: desc || '' })
const rsvi = (ip, mask) => ({ kind: 'svi', ip, mask, status: 'up' })

export function buildDevices(s) {
  const B = s.B
  const ospfNets = [
    { net: s.nets.transit.net, wild: '0.0.0.255', area: 0 },
    { net: s.nets.admin.net, wild: '0.0.0.255', area: 0 },
    { net: s.nets.ventas.net, wild: '0.0.0.255', area: 0 },
    { net: s.nets.soporte.net, wild: '0.0.0.255', area: 0 },
  ]
  if (s.topo.sw3) ospfNets.push({ net: s.nets.contab.net, wild: '0.0.0.255', area: 0 })
  const wanVia = s.topo.fw ? s.wan.fwLanIp : s.wan.ispIp
  const lanRoutes = [
    { net: s.nets.admin.net, mask: M24, via: s.nets.transit.sw1 },
    { net: s.nets.ventas.net, mask: M24, via: s.nets.transit.sw1 },
    { net: s.nets.soporte.net, mask: M24, via: s.nets.transit.sw1 },
  ]
  if (s.topo.sw3) lanRoutes.push({ net: s.nets.contab.net, mask: M24, via: s.nets.transit.sw1 })
  const sw1Vlans = { 99: 'TRANSITO', [s.va]: 'ADMIN', [s.vv]: 'VENTAS', [s.vs]: 'SOPORTE' }
  const sw1Ifaces = {
    'Gi0/1': rport('access', 99, null, 'Uplink a R1 (VLAN tránsito)'),
    'Gi0/2': rport('trunk', null, [s.vv, s.vs], 'Troncal 802.1Q a SW2'),
    'Gi0/3': rport('access', s.va, null, 'Acceso PC-ADMIN'),
    'Vlan99': rsvi(s.nets.transit.sw1, M24),
    ['Vlan' + s.va]: rsvi(s.nets.admin.gw, M24),
    ['Vlan' + s.vv]: rsvi(s.nets.ventas.gw, M24),
    ['Vlan' + s.vs]: rsvi(s.nets.soporte.gw, M24),
  }
  const sw1Stp = { 'Gi0/1': 'forwarding', 'Gi0/2': 'forwarding', 'Gi0/3': 'forwarding' }
  if (s.topo.sw3) {
    sw1Vlans[s.vc] = 'CONTABILIDAD'
    sw1Ifaces['Gi0/4'] = rport('trunk', null, [s.vc], 'Troncal 802.1Q a SW3 (Contabilidad)')
    sw1Ifaces['Vlan' + s.vc] = rsvi(s.nets.contab.gw, M24)
    sw1Stp['Gi0/4'] = 'forwarding'
  }
  const devs = {}
  devs.ISP = { id: 'ISP', name: s.names.isp, type: 'isp', role: 'Nube WAN / Internet', interfaces: { 'Gi0/0': rif(s.wan.ispIp, M30, 'Enlace ISP') }, staticRoutes: [], vlans: null, ospf: null }
  if (s.topo.fw) {
    devs.FW1 = { id: 'FW1', name: s.names.fw, type: 'firewall', role: 'Firewall perimetral',
      interfaces: { 'Gi0/0': rif(s.wan.fwWanIp, M30, 'WAN hacia ISP'), 'Gi0/1': rif(s.wan.fwLanIp, M30, 'LAN hacia R1') },
      staticRoutes: [{ net: '0.0.0.0', mask: M0, via: s.wan.ispIp }, { net: '10.' + B + '.0.0', mask: M16, via: s.wan.r1WanIp }],
      vlans: null, ospf: { enabled: false, process: 1, networks: [] } }
  }
  devs.R1 = { id: 'R1', name: s.names.r1, type: 'router', role: 'Router de sucursal (NAT hacia Internet)',
    interfaces: { 'Gi0/0': rif(s.wan.r1WanIp, M30, s.topo.fw ? 'WAN hacia FW1' : 'WAN hacia ISP'), 'Gi0/1': rif(s.nets.transit.r1, M24, 'Tránsito VLAN 99 hacia SW1') },
    staticRoutes: s.wanDesign === 'static' ? [{ net: '0.0.0.0', mask: M0, via: wanVia }].concat(lanRoutes) : [{ net: '0.0.0.0', mask: M0, via: wanVia }],
    vlans: null,
    ospf: s.wanDesign === 'ospf' ? { enabled: true, process: 1, networks: [{ net: s.nets.transit.net, wild: '0.0.0.255', area: 0 }] } : { enabled: false, process: 1, networks: [] } }
  devs.SW1 = { id: 'SW1', name: s.names.sw1, type: 'l3switch', role: 'Switch L3 core (gateway de las VLAN, router-on-a-stick)',
    vlans: sw1Vlans, interfaces: sw1Ifaces, stp: sw1Stp, portfast: {},
    staticRoutes: [{ net: '0.0.0.0', mask: M0, via: s.nets.transit.r1 }],
    ospf: s.wanDesign === 'ospf' ? { enabled: true, process: 1, networks: ospfNets.slice() } : { enabled: false, process: 1, networks: [] } }
  devs.SW2 = { id: 'SW2', name: s.names.sw2, type: 'l2switch', role: 'Switch L2 de acceso (planta baja)',
    vlans: { [s.vv]: 'VENTAS', [s.vs]: 'SOPORTE' },
    interfaces: {
      'Gi0/1': rport('trunk', null, [s.vv, s.vs], 'Troncal 802.1Q a SW1'),
      'Gi0/2': rport('access', s.vv, null, 'Acceso PC-VENTAS'),
      'Gi0/3': rport('access', s.vs, null, 'Acceso PC-SOPORTE'),
    },
    stp: { 'Gi0/1': 'forwarding', 'Gi0/2': 'forwarding', 'Gi0/3': 'forwarding' }, portfast: {},
    staticRoutes: [], ospf: null }
  if (s.topo.sw3) {
    devs.SW3 = { id: 'SW3', name: s.names.sw3, type: 'l2switch', role: 'Switch L2 de Contabilidad (planta nueva)',
      vlans: { [s.vc]: 'CONTABILIDAD' },
      interfaces: {
        'Gi0/1': rport('trunk', null, [s.vc], 'Troncal 802.1Q a SW1'),
        'Gi0/2': rport('access', s.vc, null, 'Acceso PC-CONTAB'),
      },
      stp: { 'Gi0/1': 'forwarding', 'Gi0/2': 'forwarding' }, portfast: {},
      staticRoutes: [], ospf: null }
  }
  devs.PC1 = { id: 'PC1', name: s.names.pc1, type: 'pc', role: 'PC del área administrativa (VLAN ' + s.va + ')', interfaces: {}, pc: { ip: s.pcs.admin, mask: M24, gw: s.nets.admin.gw } }
  devs.PC2 = { id: 'PC2', name: s.names.pc2, type: 'pc', role: 'PC del área de ventas (VLAN ' + s.vv + ')', interfaces: {}, pc: { ip: s.pcs.ventas, mask: M24, gw: s.nets.ventas.gw } }
  devs.PC3 = { id: 'PC3', name: s.names.pc3, type: 'pc', role: 'PC del área de soporte (VLAN ' + s.vs + ')', interfaces: {}, pc: { ip: s.pcs.soporte, mask: M24, gw: s.nets.soporte.gw } }
  if (s.topo.sw3) {
    devs.PC4 = { id: 'PC4', name: s.names.pc4, type: 'pc', role: 'PC de Contabilidad (VLAN ' + s.vc + ')', interfaces: {}, pc: { ip: s.pcs.contab, mask: M24, gw: s.nets.contab.gw } }
  }
  return devs
}

export function buildLinks(s) {
  const L = []
  if (s.topo.fw) {
    L.push({ id: 'L1', a: { dev: 'ISP', port: 'Gi0/0' }, b: { dev: 'FW1', port: 'Gi0/0' }, kind: 'wan', label: 'WAN ISP' })
    L.push({ id: 'L2', a: { dev: 'FW1', port: 'Gi0/1' }, b: { dev: 'R1', port: 'Gi0/0' }, kind: 'wan', label: 'WAN interna' })
  } else {
    L.push({ id: 'L1', a: { dev: 'ISP', port: 'Gi0/0' }, b: { dev: 'R1', port: 'Gi0/0' }, kind: 'wan', label: 'WAN ISP' })
  }
  L.push({ id: 'L3', a: { dev: 'R1', port: 'Gi0/1' }, b: { dev: 'SW1', port: 'Gi0/1' }, kind: 'eth', label: 'VLAN 99 tránsito' })
  L.push({ id: 'L4', a: { dev: 'SW1', port: 'Gi0/2' }, b: { dev: 'SW2', port: 'Gi0/1' }, kind: 'eth', label: 'Troncal 802.1Q' })
  L.push({ id: 'L5', a: { dev: 'SW1', port: 'Gi0/3' }, b: { dev: 'PC1' }, kind: 'eth', label: 'Acceso ADMIN' })
  L.push({ id: 'L6', a: { dev: 'SW2', port: 'Gi0/2' }, b: { dev: 'PC2' }, kind: 'eth', label: 'Acceso VENTAS' })
  L.push({ id: 'L7', a: { dev: 'SW2', port: 'Gi0/3' }, b: { dev: 'PC3' }, kind: 'eth', label: 'Acceso SOPORTE' })
  if (s.topo.sw3) {
    L.push({ id: 'L8', a: { dev: 'SW1', port: 'Gi0/4' }, b: { dev: 'SW3', port: 'Gi0/1' }, kind: 'eth', label: 'Troncal CONTAB' })
    L.push({ id: 'L9', a: { dev: 'SW3', port: 'Gi0/2' }, b: { dev: 'PC4' }, kind: 'eth', label: 'Acceso CONTAB' })
  }
  return L
}

export function buildGoals(s) {
  const g = [
    { id: 'g1', label: s.names.pc1 + ' (' + s.pcs.admin + ') → Gateway ADMIN ' + s.nets.admin.gw, src: 'PC1', dst: s.nets.admin.gw },
    { id: 'g2', label: s.names.pc2 + ' (' + s.pcs.ventas + ') → Gateway VENTAS ' + s.nets.ventas.gw, src: 'PC2', dst: s.nets.ventas.gw },
    { id: 'g3', label: s.names.pc1 + ' → ' + s.names.pc2 + ' (enrutamiento inter-VLAN)', src: 'PC1', dst: s.pcs.ventas },
    { id: 'g4', label: s.names.pc2 + ' → ' + s.names.pc3 + ' (enrutamiento inter-VLAN)', src: 'PC2', dst: s.pcs.soporte },
    { id: 'g5', label: s.names.pc1 + ' → Internet (' + INTERNET + ') vía NAT en R1', src: 'PC1', dst: INTERNET },
    { id: 'g6', label: s.names.pc3 + ' → Internet (' + INTERNET + ') vía NAT en R1', src: 'PC3', dst: INTERNET },
  ]
  if (s.topo.sw3) {
    g.push({ id: 'g7', label: s.names.pc4 + ' (' + s.pcs.contab + ') → Gateway CONTAB ' + s.nets.contab.gw, src: 'PC4', dst: s.nets.contab.gw })
    g.push({ id: 'g8', label: s.names.pc4 + ' → Internet (' + INTERNET + ') vía NAT en R1', src: 'PC4', dst: INTERNET })
  }
  return g
}

// Catálogo de fallas: cada instancia trae síntoma, pistas, solución exacta y aplicador
export function makeFaults(s, rnd) {
  const B = s.B, va = s.va, vv = s.vv, vs = s.vs
  const n = s.names, nets = s.nets
  const F = []
  const trunkSide = rnd() < 0.5 ? { dev: 'SW1', port: 'Gi0/2' } : { dev: 'SW2', port: 'Gi0/1' }
  const transitSide = rnd() < 0.5 ? { dev: 'R1', port: 'Gi0/1' } : { dev: 'SW1', port: 'Gi0/1' }
  const stpSide = rnd() < 0.5 ? { dev: 'SW1', port: 'Gi0/2' } : { dev: 'SW2', port: 'Gi0/1' }
  const ospfSide = rnd() < 0.5 ? 'SW1' : 'R1'

  F.push({ key: 'shut-trunk', design: null, title: 'Troncal apagado', category: 'Interfaz en shutdown',
    devId: trunkSide.dev, port: trunkSide.port,
    symptom: 'Ventas y Soporte perdieron TODA la conectividad con el core de red. El LED del enlace entre switches está apagado.',
    hints: ['Un cable rojo entre los dos switches indica un enlace físicamente caído: identifica en qué extremo hicieron shutdown.',
      'Ejecuta show ip interface brief en ' + n[trunkSide.dev.toLowerCase()] + '; el puerto ' + trunkSide.port + ' aparecerá "down". Entra al modo interfaz y reactívalo.'],
    solution: [{ devId: trunkSide.dev, cmds: ['enable', 'configure terminal', 'interface ' + trunkSide.port, 'no shutdown', 'end'] }],
    apply: (d) => { d[trunkSide.dev].interfaces[trunkSide.port].status = 'down' } })

  F.push({ key: 'shut-pc2', design: null, title: 'Puerto de acceso apagado', category: 'Interfaz en shutdown',
    devId: 'SW2', port: 'Gi0/2',
    symptom: n.pc2 + ' reporta "cable de red desconectado" desde esta mañana; el resto de la sucursal trabaja normal.',
    hints: ['El enlace hacia ' + n.pc2 + ' está en rojo en el diagrama: el puerto de acceso del switch puede estar apagado.',
      'Revisa show ip interface brief en ' + n.sw2 + ' y reactiva Gi0/2 si aparece administratively down.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/2', 'no shutdown', 'end'] }],
    apply: (d) => { d.SW2.interfaces['Gi0/2'].status = 'down' } })

  F.push({ key: 'shut-transit', design: null, title: 'Enlace de tránsito caído', category: 'Interfaz en shutdown',
    devId: transitSide.dev, port: transitSide.port,
    symptom: 'La red local entre VLANs funciona, pero nadie tiene salida a Internet ni comunicación con la matriz.',
    hints: ['El enlace entre el router y el switch L3 (VLAN de tránsito 99) podría estar caído: búscalo en rojo en el diagrama.',
      'Ejecuta show ip interface brief en ' + n.r1 + ' y en ' + n.sw1 + '; reactiva el puerto ' + transitSide.port + ' de ' + n[transitSide.dev.toLowerCase()] + '.'],
    solution: [{ devId: transitSide.dev, cmds: ['enable', 'configure terminal', 'interface ' + transitSide.port, 'no shutdown', 'end'] }],
    apply: (d) => { d[transitSide.dev].interfaces[transitSide.port].status = 'down' } })

  F.push({ key: 'wrong-access-vlan', design: null, title: 'VLAN de acceso incorrecta', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW2', port: 'Gi0/3',
    symptom: n.pc3 + ' tiene enlace (LED verde) y su IP correcta, pero no alcanza su gateway ni sale a Internet.',
    hints: ['El puerto de ' + n.pc3 + ' podría estar asignado a otra VLAN: compáralo con el plan de direccionamiento del ticket.',
      'En ' + n.sw2 + ' usa show vlan brief: verifica en qué VLAN aparece Gi0/3 y corrígelo con switchport access vlan ' + vs + '.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/3', 'switchport access vlan ' + vs, 'end'] }],
    apply: (d) => { d.SW2.interfaces['Gi0/3'].accessVlan = vv } })

  F.push({ key: 'missing-vlan', design: null, title: 'VLAN no creada en switch de acceso', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW2', port: null,
    symptom: n.pc3 + ' quedó totalmente aislado tras un reinicio del switch de acceso; el cable está bien conectado pero el puerto aparece inactivo.',
    hints: ['Un puerto access asignado a una VLAN que no existe en el switch queda inactivo (protocol down).',
      'Ejecuta show vlan brief en ' + n.sw2 + ': ¿existe la VLAN ' + vs + '? Si falta, créala con vlan ' + vs + '.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'vlan ' + vs, 'name SOPORTE', 'end'] }],
    apply: (d) => { delete d.SW2.vlans[vs] } })

  F.push({ key: 'trunk-mode', design: null, title: 'Puerto troncal reconfigurado como acceso', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW2', port: 'Gi0/1',
    symptom: 'Tras el cambio de un técnico externo, Ventas y Soporte perdieron conectividad con el core; el enlace entre switches se ve en ámbar.',
    hints: ['El cable naranja entre SW1 y SW2 indica trunking/VLAN mismatch: un extremo dejó de ser troncal.',
      'show interfaces trunk en ' + n.sw2 + ' aparecerá vacío: reconfigura Gi0/1 como troncal permitiendo las VLAN ' + vv + ',' + vs + '.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/1', 'switchport mode trunk', 'switchport trunk allowed vlan ' + vv + ',' + vs, 'end'] }],
    apply: (d) => { const i = d.SW2.interfaces['Gi0/1']; i.mode = 'access'; i.accessVlan = vs; i.allowed = [] } })

  F.push({ key: 'trunk-allowed', design: null, title: 'Lista de VLAN permitidas incompleta', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW2', port: 'Gi0/1',
    symptom: 'El área de Ventas trabaja sin problemas, pero Soporte no alcanza su gateway ni Internet.',
    hints: ['Solo una VLAN deja de atravesar el troncal: suena a lista de VLANs permitidas incompleta.',
      'En ' + n.sw2 + ' ejecuta show interfaces trunk y compara las VLAN permitidas con el plan; agrega la VLAN ' + vs + ' al troncal.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/1', 'switchport trunk allowed vlan ' + vv + ',' + vs, 'end'] }],
    apply: (d) => { d.SW2.interfaces['Gi0/1'].allowed = [vv] } })

  F.push({ key: 'stp-block', design: null, title: 'Puerto bloqueado por STP', category: 'Spanning-Tree',
    devId: stpSide.dev, port: stpSide.port,
    symptom: 'El enlace entre switches quedó bloqueado por Spanning-Tree tras detectar un loop accidental (LED ámbar); Ventas y Soporte sin red.',
    hints: ['Un cable naranja punteado = puerto en BLOCKING por STP. Identifica qué extremo está bloqueado.',
      'show spanning-tree brief en ambos switches mostrará el puerto en BLOCKING; en ese puerto usa spanning-tree portfast trunk para restaurar el reenvío.'],
    solution: [{ devId: stpSide.dev, cmds: ['enable', 'configure terminal', 'interface ' + stpSide.port, 'spanning-tree portfast trunk', 'end'] }],
    apply: (d) => { d[stpSide.dev].stp[stpSide.port] = 'blocking' } })

  F.push({ key: 'wrong-svi', design: null, title: 'SVI con subred incorrecta', category: 'Configuración IP / Subredes',
    devId: 'SW1', port: 'Vlan' + vv,
    symptom: n.pc2 + ' no alcanza su gateway ' + nets.ventas.gw + '; las demás VLAN funcionan con normalidad.',
    hints: ['El gateway de cada VLAN vive en el switch L3 como interfaz virtual (SVI): verifica su IP.',
      'En ' + n.sw1 + ' ejecuta show ip interface brief: la SVI Vlan' + vv + ' debe valer ' + nets.ventas.gw + ' ' + M24 + '.'],
    solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'interface Vlan' + vv, 'ip address ' + nets.ventas.gw + ' ' + M24, 'end'] }],
    apply: (d) => { d.SW1.interfaces['Vlan' + vv].ip = '10.' + B + '.21.1' } })

  F.push({ key: 'wrong-pc-ip', design: null, title: 'TCP/IP manual incorrecto en PC', category: 'Configuración IP / Subredes',
    devId: 'PC2', port: null,
    symptom: 'Tras mantenimiento, ' + n.pc2 + ' quedó con configuración TCP/IP manual incorrecta (IP/máscara fuera de su subred) y no alcanza su gateway.',
    hints: ['No todo es infraestructura: revisa también la configuración del propio equipo afectado.',
      'Abre la consola de ' + n.pc2 + ' y usa ipconfig: debe ser ' + s.pcs.ventas + ' ' + M24 + ' con gateway ' + nets.ventas.gw + ' (la máscara /25 no corresponde).'],
    solution: [{ devId: 'PC2', cmds: ['ip ' + s.pcs.ventas + ' ' + M24 + ' ' + nets.ventas.gw] }],
    apply: (d) => { d.PC2.pc = { ip: '10.' + B + '.20.200', mask: '255.255.255.128', gw: nets.ventas.gw } } })

  F.push({ key: 'missing-static-route', design: 'static', title: 'Ruta estática faltante en el router', category: 'Enrutamiento (ruta estática)',
    devId: 'R1', port: null,
    symptom: n.pc3 + ' se comunica en su VLAN y alcanza su gateway, pero no tiene salida a Internet; Admin y Ventas sí navegan.',
    hints: ['El tráfico de Soporte llega al router, pero este no sabe cómo regresar a esa subred (NAT falla sin ruta de vuelta).',
      'show ip route en ' + n.r1 + ': falta la ruta hacia ' + nets.soporte.net + '/24 vía el switch L3 (' + nets.transit.sw1 + ').'],
    solution: [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'ip route ' + nets.soporte.net + ' ' + M24 + ' ' + nets.transit.sw1, 'end'] }],
    apply: (d) => { d.R1.staticRoutes = d.R1.staticRoutes.filter((r) => r.net !== nets.soporte.net) } })

  F.push({ key: 'missing-default-sw1', design: 'static', title: 'Ruta por defecto faltante en switch L3', category: 'Enrutamiento (ruta estática)',
    devId: 'SW1', port: null,
    symptom: 'NINGÚN equipo de la sucursal tiene salida a Internet; la red local (inter-VLAN) funciona perfecto.',
    hints: ['Si todo falla hacia Internet pero la red local funciona, el problema está en la ruta por defecto del switch L3.',
      'show ip route en ' + n.sw1 + ': debe existir S* 0.0.0.0/0 vía ' + nets.transit.r1 + '.'],
    solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'ip route 0.0.0.0 ' + M0 + ' ' + nets.transit.r1, 'end'] }],
    apply: (d) => { d.SW1.staticRoutes = d.SW1.staticRoutes.filter((r) => r.net !== '0.0.0.0') } })

  F.push({ key: 'ospf-down', design: 'ospf', title: 'Proceso OSPF caído', category: 'Enrutamiento (OSPF)',
    devId: ospfSide, port: null,
    symptom: 'R1 y el switch L3 dejaron de intercambiar rutas dinámicas: sin salida a Internet en toda la sucursal. El diseño de red usa OSPF área 0.',
    hints: ['El ticket indica que el enrutamiento dinámico es OSPF: verifica el proceso en ' + n.r1 + ' y en ' + n.sw1 + '.',
      'show ip protocols y show ip route: quien no muestre rutas marcadas con "O" tiene el proceso caído. Restablécelo con router ospf 1 y sus statements network.'],
    solution: ospfSide === 'SW1'
      ? [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'router ospf 1',
          'network ' + nets.transit.net + ' 0.0.0.255 area 0',
          'network ' + nets.admin.net + ' 0.0.0.255 area 0',
          'network ' + nets.ventas.net + ' 0.0.0.255 area 0',
          'network ' + nets.soporte.net + ' 0.0.0.255 area 0'].concat(s.topo.sw3 ? ['network ' + nets.contab.net + ' 0.0.0.255 area 0'] : []).concat(['end']) }]
      : [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'router ospf 1',
          'network ' + nets.transit.net + ' 0.0.0.255 area 0', 'end'] }],
    apply: (d) => { d[ospfSide].ospf = { enabled: false, process: 1, networks: [] } } })

  F.push({ key: 'acl-block', design: null, title: 'ACL que bloquea a una subred', category: 'Seguridad (ACL)',
    devId: 'R1', port: 'Gi0/1',
    symptom: 'Tras un cambio de seguridad, ' + n.pc3 + ' perdió toda salida a Internet y el acceso a la matriz, aunque su red local funciona; Admin y Ventas navegan sin problema.',
    hints: ['Una ACL aplicada en una interfaz descarta tráfico por política, sin que el enlace se caiga: el paquete simplemente no pasa.',
      'En ' + n.r1 + ' ejecuta show access-lists y show running-config: hay una ACL aplicada en Gi0/1 (entrada) que niega ' + nets.soporte.net + '.'],
    solution: [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'interface Gi0/1', 'no ip access-group 110 in', 'end'] }],
    apply: (d) => {
      d.R1.acls = d.R1.acls || {}
      d.R1.acls['110'] = [
        { action: 'deny', proto: 'ip', src: nets.soporte.net + '/0.0.0.255', dst: 'any' },
        { action: 'permit', proto: 'ip', src: 'any', dst: 'any' },
      ]
      d.R1.aclApply = d.R1.aclApply || []
      d.R1.aclApply.push({ iface: 'Gi0/1', dir: 'in', name: '110' })
    } })

  F.push({ key: 'port-security', design: null, title: 'Puerto en err-disabled por port-security', category: 'Seguridad (port security)',
    devId: 'SW2', port: 'Gi0/3',
    symptom: n.pc3 + ' amaneció sin enlace: el switch detectó una MAC no autorizada en su puerto y lo deshabilitó automáticamente por seguridad.',
    hints: ['El puerto no quedó apagado por administración: Port Security lo llevó a estado err-disabled tras una violación.',
      'En ' + n.sw2 + ' ejecuta show port-security y show interfaces Gi0/3: verás "Secure-shutdown". Recupera el puerto con shutdown y luego no shutdown.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/3', 'shutdown', 'no shutdown', 'end'] }],
    apply: (d) => { d.SW2.interfaces['Gi0/3'].security = { enabled: true, max: 1, violation: 'shutdown', state: 'err-disabled' } } })

  if (s.topo.sw3) {
    const side3 = rnd() < 0.5 ? { dev: 'SW1', port: 'Gi0/4' } : { dev: 'SW3', port: 'Gi0/1' }
    F.push({ key: 'shut-sw3trunk', design: null, title: 'Troncal de Contabilidad caído', category: 'Interfaz en shutdown',
      devId: side3.dev, port: side3.port,
      symptom: 'Toda el área de Contabilidad (planta nueva, ' + n.pc4 + ') perdió su red de golpe; el resto de la sucursal trabaja normal.',
      hints: ['El enlace hacia el switch nuevo de Contabilidad está en rojo en el diagrama: revisa ambos extremos del troncal.',
        'Ejecuta show ip interface brief en ' + n.sw3 + ' (o en ' + n.sw1 + '): el puerto ' + side3.port + ' está caído; reactívalo con no shutdown.'],
      solution: [{ devId: side3.dev, cmds: ['enable', 'configure terminal', 'interface ' + side3.port, 'no shutdown', 'end'] }],
      apply: (d) => { d[side3.dev].interfaces[side3.port].status = 'down' } })
  }

  return F
}

export function chooseFaults(s) {
  const rnd = mulberry32((s.seed >>> 0) ^ 0x5bf03635)
  let pool = makeFaults(s, rnd).filter((f) => !f.design || f.design === s.wanDesign)
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  const r = rnd()
  const k = r < 0.55 ? 1 : (r < 0.85 ? 2 : 3)
  const used = new Set()
  const out = []
  for (const f of pool) {
    const key = f.devId + '|' + (f.port || 'global')
    if (used.has(key)) continue
    used.add(key); out.push(f)
    if (out.length === k) break
  }
  return out
}

export function scenarioFaults(spec, sc) {
  if (sc && sc.faultKeys) {
    const rnd = mulberry32((spec.seed >>> 0) ^ 0x5bf03635)
    const pool = makeFaults(spec, rnd)
    const faults = sc.faultKeys.map((k) => pool.find((f) => f.key === k)).filter(Boolean)
    if (faults.length === sc.faultKeys.length) return faults
  }
  return chooseFaults(spec)
}
