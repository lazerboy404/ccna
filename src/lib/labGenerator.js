// Generador de laboratorios: escenarios reales, dispositivos, enlaces, objetivos y catálogo de fallas
import { mulberry32, M24, M30, M16, M0, INTERNET } from './utils.js'

export const TOPO_ORDER = ['ISP', 'FW1', 'R1', 'SW1', 'SW2', 'SW3', 'PC1', 'PC2', 'PC3', 'PC4']

const SITES = ['Monterrey', 'Guadalajara', 'CDMX', 'Puebla', 'Tijuana', 'Merida', 'Queretaro', 'Leon', 'Cancun', 'Toluca']
const TECHS = ['Ana Torres', 'Luis Gomez', 'Maria Ruiz', 'Carlos Diaz', 'Sofia Vera', 'Diego Rios', 'Paula Mendez']
const PRIOS = ['Alta', 'Media', 'Crítica']

export const SCENARIOS = [
  { key: 'b-cable', diff: 'Básico', title: 'Computadora sin red en Ventas', design: null, sw3: null, faultKeys: ['shut-pc2'],
    story: s => '«Buenos días. Una computadora de Ventas amaneció sin internet: en la pantalla sale un aviso de que el cable de red está desconectado. Lo desconecté y lo volví a conectar, pero sigue igual. Las demás computadoras del área sí funcionan.» — Recepción' },
  { key: 'b-troncal', diff: 'Básico', title: 'Dos áreas sin red', design: null, sw3: null, faultKeys: ['shut-trunk'],
    story: s => '«Desde que movieron muebles y cables para la limpieza, las áreas de Ventas y Soporte se quedaron sin internet y sin poder ver las carpetas compartidas. Las demás áreas sí trabajan.» — Mesa de ayuda' },
  { key: 'b-ip-manual', diff: 'Básico', title: 'Mi computadora no entra a nada', design: null, sw3: null, faultKeys: ['wrong-pc-ip'],
    story: s => '«Ayer quise arreglar mi computadora y cambié unos números de red que me pasó un conocido. Desde entonces no entro a nada: ni a internet ni a la carpeta compartida. La computadora de al lado sí funciona.» — Ana, Ventas' },
  { key: 'b-transito', diff: 'Básico', title: 'Sin internet en toda la empresa', design: null, sw3: null, faultKeys: ['shut-transit'],
    story: s => '«Entre oficinas nos vemos y compartimos archivos, pero nadie puede abrir páginas ni el correo. Le pasa a toda la empresa por igual.» — Gerencia' },
  { key: 'b-vlan-fantasma', diff: 'Básico', title: 'Soporte sin red tras el apagón', design: null, sw3: null, faultKeys: ['missing-vlan'],
    story: s => '«Después del apagón, las computadoras de Soporte amanecieron sin internet. El cable está conectado y la computadora prende normal, pero no entra a nada. Las demás áreas sí trabajan.» — Mesa de ayuda' },
  { key: 'i-gateway-fantasma', diff: 'Intermedio', title: 'Ventas no sale a internet', design: null, sw3: null, faultKeys: ['wrong-svi'],
    story: s => '«La gente de Ventas no puede abrir nada de internet y eso los detiene. En las demás áreas sí funciona. No movimos nada, no sabemos qué pasó.» — Jefe de Ventas' },
  { key: 'i-usuario-solitario', diff: 'Intermedio', title: 'Solo una computadora sin red', design: null, sw3: null, faultKeys: ['wrong-access-vlan'],
    story: s => '«Solo yo tengo el problema: mi computadora prende y el cable está bien, pero no alcanzo ni a la compañera de al lado ni a internet. Todos los demás del área trabajan normal.» — Mesa de ayuda' },
  { key: 'i-loop', diff: 'Intermedio', title: 'Se cayó la red del piso', design: null, sw3: null, faultKeys: ['stp-block'],
    story: s => '«Alguien conectó un aparato viejito "para tener más entradas" y se cayó la red del piso. Ya lo quitaron, pero sigue sin funcionar y hay una luz anaranjada en el aparato principal.» — Soporte de TI' },
  { key: 'i-soporte-sin-net', diff: 'Intermedio', title: 'Soporte sin internet', design: 'static', sw3: null, faultKeys: ['missing-static-route'],
    story: s => '«La gente de Soporte ve las carpetas compartidas entre ellos e incluso imprime, pero no abre internet ni el correo. Ventas y Administración navegan sin problema.» — Mesa de ayuda' },
  { key: 'i-puerta-perdida', diff: 'Intermedio', title: 'Nadie sale a internet', design: 'static', sw3: null, faultKeys: ['missing-default-sw1'],
    story: s => '«Nadie en la empresa sale a internet. Entre nosotros sí nos vemos. El aparato del proveedor tiene sus luces encendidas como siempre.» — Gerencia' },
  { key: 'i-ospf-mudo', diff: 'Intermedio', title: 'Sin internet tras el mantenimiento', design: 'ospf', sw3: null, faultKeys: ['ospf-down'],
    story: s => '«Después del mantenimiento de anoche, toda la empresa se quedó sin internet, aunque entre nosotros nos seguimos viendo. No tocamos nada más.» — Soporte de TI' },
  { key: 'a-turno-nocturno', diff: 'Avanzado', title: 'Turno nocturno', design: null, sw3: null, faultKeys: ['shut-transit', 'wrong-access-vlan'],
    story: s => '«El turno de noche movió varias cosas. El reporte del lunes: nadie tiene internet, en algunas áreas se ven entre sí y Soporte no tiene nada. Parecen varios problemas juntos.» — Gerencia' },
  { key: 'a-tecnico-externo', diff: 'Avanzado', title: 'El técnico externo', design: null, sw3: null, faultKeys: ['trunk-mode', 'missing-vlan'],
    story: s => '«Vino un técnico externo a "ordenar" el área y ahora Ventas y Soporte están incomunicados; solo Administración trabaja. Un cable del aparato central se ve mal puesto.» — Soporte de TI' },
  { key: 'a-doble-reporte', diff: 'Avanzado', title: 'Doble reporte confuso', design: null, sw3: null, faultKeys: ['stp-block', 'wrong-pc-ip'],
    story: s => '«Primero se cayó todo el piso de abajo por un aparato mal conectado; cuando lo quitaron, una computadora de Ventas siguió sin internet. Dicen que alguien le tocó los números durante el problema.» — Mesa de ayuda' },
  { key: 'a-planta-nueva', diff: 'Avanzado', title: 'La planta nueva', design: null, sw3: true, faultKeys: ['shut-sw3trunk', 'wrong-access-vlan'],
    story: s => '«Contabilidad, en el piso nuevo, se quedó sin red de repente. Y aparte, en Soporte una computadora tiene sus datos bien pero no entra a nada. Ventas y Administración trabajan bien.» — Gerencia' },
  { key: 'a-lunes-negro', diff: 'Avanzado', title: 'Lunes negro', design: null, sw3: null, faultKeys: ['shut-pc2', 'wrong-svi', 'trunk-allowed'],
    story: s => '«Tres reportes el mismo lunes: una computadora de Ventas sin red, todo Ventas sin poder abrir nada y Soporte aislado del resto. Administración opera sin problema. Es urgente.» — Mesa de ayuda' },
  { key: 'i-acl', diff: 'Intermedio', title: 'Aislamiento tras la seguridad', design: null, sw3: null, faultKeys: ['acl-block'],
    story: s => '«Desde que reforzaron la seguridad, Soporte no tiene internet, pero Ventas y Administración navegan normal. Entre los equipos de Soporte sí se ven.» — Mesa de ayuda' },
  { key: 'i-portsecurity', diff: 'Intermedio', title: 'Computadora sin red', design: null, sw3: null, faultKeys: ['port-security'],
    story: s => '«La computadora de Soporte amaneció sin red: Windows dice que el cable está desconectado, pero el cable está bien conectado. Ayer movieron equipos de lugar.» — Soporte de TI' },
  { key: 'a-seguridad', diff: 'Avanzado', title: 'Área aislada', design: null, sw3: null, faultKeys: ['acl-block', 'port-security'],
    story: s => '«Después de aplicar políticas nuevas, Soporte quedó aislado por dos lados: una computadora sin red y sin internet, mientras Ventas y Administración trabajan con normalidad.» — Gerencia' },
  { key: 'c-edificio', diff: 'Básico', build: true, template: 'building', title: 'El edificio nuevo', design: null, sw3: null, faultKeys: null,
    story: s => '«Acabamos de habilitar ' + s.build.building + ' y necesitamos que ' + s.build.pcs.length + ' equipos de ' + s.build.area + ' tengan red e internet. Trajeron un aparato central nuevo y nadie lo ha configurado.» — TI' },
  { key: 'c-piso', diff: 'Intermedio', build: true, template: 'floor', title: 'Ampliación de piso', design: null, sw3: null, faultKeys: null,
    story: s => '«Remodelamos el piso y sumamos ' + s.build.pcs.length + ' puestos de ' + s.build.area + '. En el aparato central hay entradas libres, pero hay que conectar los equipos y dejarlos navegando. El resto de la red ya funciona.» — Gerencia' },
  { key: 'c-edificio-avz', diff: 'Avanzado', build: true, template: 'building', title: 'Puesta en marcha del edificio', design: null, sw3: null, faultKeys: null,
    story: s => '«Día uno de ' + s.build.building + ': ' + s.build.pcs.length + ' estaciones de ' + s.build.area + ' y el aparato central listos para instalar. Necesitamos que TODO quede navegando.» — Dirección' },
  { key: 'c-wifi', diff: 'Intermedio', build: true, template: 'wifi', title: 'La oficina inalámbrica', design: null, sw3: null, faultKeys: null,
    story: s => '«Abrimos un área de trabajo flexible y será todo por WiFi: llegó un aparato de WiFi y ' + s.build.pcs.length + ' laptops. Necesitamos que naveguen sin cables.» — TI' },
  { key: 'i-servidor', diff: 'Intermedio', srv: true, title: 'No entramos al servidor', design: null, sw3: null, faultKeys: ['srv-wrong-vlan'],
    story: s => '«Nadie puede entrar a la aplicación del servidor desde que movieron el rack. El servidor está encendido y lo demás funciona con normalidad.» — Sistemas' },
  { key: 'i-camara', diff: 'Básico', cam: true, title: 'La cámara no graba', design: null, sw3: null, faultKeys: ['cam-shut'],
    story: s => '«La cámara de la entrada dejó de grabar; el resto de las cámaras y la red funcionan bien.» — Seguridad' },
  { key: 'a-srv-cam', diff: 'Avanzado', srv: true, cam: true, title: 'Servidor y cámara caídos', design: null, sw3: null, faultKeys: ['srv-wrong-vlan', 'cam-shut'],
    story: s => '«Dos reportes el mismo día: no podemos entrar a la aplicación del servidor y la cámara de la entrada no graba. Los dos equipos están en el cuarto del centro de cómputo.» — Mesa de ayuda' },
  { key: 'i-nat', diff: 'Intermedio', title: 'No abre Internet', design: null, sw3: null, faultKeys: ['nat-swapped'],
    story: s => '«La red interna funciona: nos vemos y compartimos archivos, pero nadie abre páginas de internet. El aparato del proveedor está normal.» — Gerencia' },
  { key: 'i-native-vlan', diff: 'Intermedio', title: 'Ventas sin red', design: null, sw3: null, faultKeys: ['native-mismatch'],
    story: s => '«En Ventas no abren nada desde que alguien tocó el aparato central; Soporte y Administración sí trabajan.» — Mesa de ayuda' },
  { key: 'i-encap', diff: 'Intermedio', title: 'Ventas y Soporte sin red', design: null, sw3: null, faultKeys: ['encap-mismatch'],
    story: s => '«Ventas y Soporte se quedaron sin red de repente; el aparato central tiene una luz anaranjada donde se conectan los cables.» — Soporte de TI' },
  { key: 'a-vlan-trunk', diff: 'Avanzado', title: 'El troncal mal configurado', design: null, sw3: null, faultKeys: ['trunk-mode', 'native-mismatch'],
    story: s => '«Después de mover equipo, Ventas y Soporte quedaron sin red por completo y un cable del aparato central se ve raro.» — Gerencia' },
  { key: 'i-cam-fabrica', diff: 'Básico', cam: true, title: 'La cámara que se mojó', design: null, sw3: null, faultKeys: ['cam-factory'],
    story: s => '«La cámara de la entrada dejó de grabar después de mojarse con la lluvia. La secaron y volvió a encender, pero ya no se ve en el sistema.» — Seguridad' },
  { key: 'i-cam-cable', diff: 'Básico', cam: true, title: 'Cable cortado', design: null, sw3: null, faultKeys: ['cam-cut'],
    story: s => '«La cámara de la entrada no graba; parece que alguien trozó el cable al mover unas cajas. Todo lo demás funciona.» — Seguridad' },
  { key: 'i-cam-dup', diff: 'Intermedio', cam: true, title: 'Números repetidos', design: null, sw3: null, faultKeys: ['cam-dupip'],
    story: s => '«La cámara de la entrada graba a ratos y una computadora de Soporte empezó a fallar. Creo que a dos equipos les quedaron los mismos números.» — Soporte de TI' },
  { key: 'i-cam-fuera', diff: 'Intermedio', cam: true, title: 'Cámara en otro segmento', design: null, sw3: null, faultKeys: ['cam-offsubnet'],
    story: s => '«La cámara de la entrada no aparece en el sistema desde que la reinstalaron en otro poste. Tiene luz, pero no se ve.» — Seguridad' },
  { key: 'i-srv-fabrica', diff: 'Intermedio', srv: true, title: 'El servidor quedó de fábrica', design: null, sw3: null, faultKeys: ['srv-factory'],
    story: s => '«La aplicación dejó de responder después de un corte de luz. El servidor está encendido, pero quedó como recién salido de caja.» — Sistemas' },
  { key: 'i-gw-malo', diff: 'Intermedio', title: 'Internet a medias', design: null, sw3: null, faultKeys: ['pc-wrong-gw'],
    story: s => '«En una computadora de Ventas abro las cosas de la oficina, pero no las páginas de internet. En las demás computadoras sí.» — Mesa de ayuda' },
  { key: 'a-cam-pc', diff: 'Avanzado', cam: true, title: 'Cámara y computadora', design: null, sw3: null, faultKeys: ['cam-cut', 'pc-wrong-gw'],
    story: s => '«Dos reportes: la cámara de la entrada no graba (parece que trozaron el cable) y una computadora de Ventas no abre internet. Lo demás funciona.» — Mesa de ayuda' },
  { key: 'a-srv-fuera', diff: 'Avanzado', srv: true, title: 'Servidor y computadora', design: null, sw3: null, faultKeys: ['srv-offsubnet', 'pc-wrong-gw'],
    story: s => '«Después de mover equipo, el servidor quedó inalcanzable y una computadora de Ventas no abre internet. El resto trabaja bien.» — Gerencia' },
  { key: 'i-acceso-seguro', diff: 'Intermedio', title: 'Asegurar el acceso', design: null, sw3: null, faultKeys: [],
    story: s => '«Sistemas pide proteger el router principal: que exija contraseñas y que solo se pueda administrar de forma remota con SSH.» — TI',
    task: {
      key: 'task-access', title: 'Proteger el acceso al router', category: 'Seguridad (acceso al dispositivo)',
      hints: ['Protege el modo privilegiado con enable secret y la consola/VTY con password + login.',
        'Para SSH necesitas ip domain-name, generar llaves RSA (crypto key generate rsa) y transport input ssh en line vty.'],
      solution: [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'enable secret cisco1', 'service password-encryption', 'ip domain-name corp.local', 'username admin secret cisco2', 'crypto key generate rsa', 'line console 0', 'password cisco2', 'login', 'exit', 'line vty 0 4', 'password cisco3', 'login', 'transport input ssh', 'end'] }],
    },
    extraGoals: (s) => [
      { id: 'x-enable', label: 'Contraseña de modo privilegiado (enable secret)', check: (l) => l.devices.R1.enableSecret ? true : { ok: false, reason: 'Configura: enable secret <clave>' } },
      { id: 'x-console', label: 'Contraseña en la consola (console 0)', check: (l) => l.devices.R1.consolePass ? true : { ok: false, reason: 'line console 0 → password <clave> → login' } },
      { id: 'x-vty', label: 'Contraseña en las líneas VTY', check: (l) => l.devices.R1.vtyPass ? true : { ok: false, reason: 'line vty 0 4 → password <clave> → login' } },
      { id: 'x-ssh', label: 'Administración remota solo por SSH', check: (l) => { const r = l.devices.R1; return (r.rsa && r.vtyTransport && /ssh/.test(r.vtyTransport)) ? true : { ok: false, reason: 'crypto key generate rsa y line vty 0 4 → transport input ssh' } } },
    ] },
  { key: 'i-ntp', diff: 'Intermedio', title: 'Relojes desincronizados', design: null, sw3: null, faultKeys: [],
    story: s => '«Los registros del switch principal tienen una hora distinta a la de los demás equipos; quieren que se sincronice con el router central.» — Soporte',
    task: (s) => ({
      key: 'task-ntp', title: 'Sincronizar el reloj del switch', category: 'Servicios IP (NTP)',
      hints: ['El switch debe tomar la hora de un servidor NTP; el router central puede serlo.',
        'En ' + s.names.sw1 + ': ntp server ' + s.nets.transit.r1 + '.'],
      solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'ntp server ' + s.nets.transit.r1, 'end'] }],
    }),
    extraGoals: (s) => [
      { id: 'x-ntp', label: 'El switch sincroniza su reloj con ' + s.names.r1 + ' (' + s.nets.transit.r1 + ')', check: (l) => {
        const n = l.devices.SW1.ntpServers || []
        return n.includes(s.nets.transit.r1) ? true : { ok: false, reason: 'En ' + s.names.sw1 + ': ntp server ' + s.nets.transit.r1 }
      } },
    ] },
  { key: 'i-dhcp', diff: 'Intermedio', title: 'Direcciones automáticas', design: null, sw3: null, faultKeys: [],
    story: s => '«Quieren que las computadoras de Ventas tomen su dirección de red automáticamente. Prepara el servicio en el router principal.» — TI',
    task: (s) => ({
      key: 'task-dhcp', title: 'Configurar el servicio DHCP', category: 'Servicios IP (DHCP)',
      hints: ['Crea un pool DHCP en ' + s.names.r1 + ' para la red de Ventas.',
        'Comandos: ip dhcp pool VENTAS → network ' + s.nets.ventas.net + ' 255.255.255.0 → default-router ' + s.nets.ventas.gw + '.'],
      solution: [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'ip dhcp pool VENTAS', 'network ' + s.nets.ventas.net + ' 255.255.255.0', 'default-router ' + s.nets.ventas.gw, 'exit', 'end'] }],
    }),
    extraGoals: (s) => [
      { id: 'x-dhcp', label: 'Pool DHCP para Ventas (' + s.nets.ventas.net + '/24, gw ' + s.nets.ventas.gw + ')', check: (l) => {
        const p = (l.devices.R1.dhcpPools || []).find((x) => x.network === s.nets.ventas.net && x.router === s.nets.ventas.gw)
        return p ? true : { ok: false, reason: 'En ' + s.names.r1 + ': ip dhcp pool VENTAS → network ' + s.nets.ventas.net + ' 255.255.255.0 → default-router ' + s.nets.ventas.gw }
      } },
    ] },
  { key: 'sorpresa', diff: 'Mixto', title: 'Incidente sin clasificar', design: null, sw3: null, faultKeys: null,
    story: s => '«La red no sirve bien. Hay varios reportes sueltos y nadie sabe por dónde empezar. Revísalo tú, por favor.» — Mesa de ayuda' },
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
    topo: { fw, sw3, srv: !!(sc && sc.srv), cam: !!(sc && sc.cam) },
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
const rport = (mode, vlan, allowed, desc) => ({ kind: 'port', mode, accessVlan: vlan !== undefined ? vlan : null, allowed: allowed || [], nativeVlan: 1, encap: 'dot1q', status: 'up', desc: desc || '' })
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
  if (s.topo.srv) { sw1Ifaces['Gi0/5'] = rport('access', s.va, null, 'Acceso servidor'); sw1Stp['Gi0/5'] = 'forwarding' }
  if (s.topo.cam) { sw1Ifaces['Gi0/6'] = rport('access', s.vs, null, 'Acceso cámara IP'); sw1Stp['Gi0/6'] = 'forwarding' }
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
  devs.R1.interfaces['Gi0/1'].natRole = 'inside'
  devs.R1.interfaces['Gi0/0'].natRole = 'outside'
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
  if (s.topo.srv) {
    devs.SRV1 = { id: 'SRV1', name: 'SRV-APP', type: 'server', role: 'Servidor de aplicaciones (VLAN ' + s.va + ')', interfaces: {}, pc: { ip: '10.' + B + '.10.20', mask: M24, gw: s.nets.admin.gw } }
  }
  if (s.topo.cam) {
    devs.CAM1 = { id: 'CAM1', name: 'CAM-01', type: 'camera', role: 'Cámara IP de seguridad (VLAN ' + s.vs + ')', interfaces: {}, pc: { ip: '10.' + B + '.30.20', mask: M24, gw: s.nets.soporte.gw } }
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
  if (s.topo.srv) L.push({ id: 'L10', a: { dev: 'SW1', port: 'Gi0/5' }, b: { dev: 'SRV1' }, kind: 'eth', label: 'Acceso SERVIDOR' })
  if (s.topo.cam) L.push({ id: 'L11', a: { dev: 'SW1', port: 'Gi0/6' }, b: { dev: 'CAM1' }, kind: 'eth', label: 'Acceso CÁMARA' })
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
  if (s.topo.srv) {
    g.push({ id: 'g9', label: 'SRV-APP (10.' + s.B + '.10.20) → Gateway ADMIN ' + s.nets.admin.gw, src: 'SRV1', dst: s.nets.admin.gw })
    g.push({ id: 'g10', label: 'PC-ADMIN → SRV-APP (10.' + s.B + '.10.20)', src: 'PC1', dst: '10.' + s.B + '.10.20' })
  }
  if (s.topo.cam) {
    g.push({ id: 'g11', label: 'CAM-01 (10.' + s.B + '.30.20) → Gateway SOPORTE ' + s.nets.soporte.gw, src: 'CAM1', dst: s.nets.soporte.gw })
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

  if (s.topo.srv) {
    F.push({ key: 'srv-wrong-vlan', design: null, title: 'Servidor en la VLAN equivocada', category: 'VLAN / Trunking 802.1Q',
      devId: 'SW1', port: 'Gi0/5',
      symptom: 'El servidor de aplicaciones SRV-APP (10.' + B + '.10.20) dejó de ser alcanzable desde Admin y Ventas; quedó en la VLAN incorrecta tras un cambio.',
      hints: ['El servidor tiene enlace pero no responde en su subred esperada: revisa la VLAN del puerto donde está conectado.',
        'En ' + n.sw1 + ' usa show vlan brief: Gi0/5 debe estar en la VLAN ' + va + ' (ADMIN). Corrige con switchport access vlan ' + va + '.'],
      solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'interface Gi0/5', 'switchport access vlan ' + va, 'end'] }],
      apply: (d) => { d.SW1.interfaces['Gi0/5'].accessVlan = vv } })
  }
  if (s.topo.cam) {
    F.push({ key: 'cam-shut', design: null, title: 'Cámara IP sin enlace', category: 'Interfaz en shutdown',
      devId: 'SW1', port: 'Gi0/6',
      symptom: 'La cámara de seguridad CAM-01 (10.' + B + '.30.20) no responde: el puerto del switch que la alimenta está caído.',
      hints: ['En el diagrama el enlace hacia la cámara está en rojo: el puerto de acceso puede estar en shutdown.',
        'En ' + n.sw1 + ' ejecuta show ip interface brief: reactiva Gi0/6 con no shutdown.'],
      solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'interface Gi0/6', 'no shutdown', 'end'] }],
      apply: (d) => { d.SW1.interfaces['Gi0/6'].status = 'down' } })
  }

  F.push({ key: 'native-mismatch', design: null, title: 'VLAN nativa distinta en el troncal', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW1', port: 'Gi0/2',
    symptom: 'El área de Ventas perdió la conexión con el resto de la red tras un cambio en el aparato central; Soporte sí tiene red.',
    hints: ['En un enlace troncal la VLAN nativa debe coincidir en ambos extremos; si no coincide, esa VLAN deja de pasar bien.',
      'Ejecuta show interfaces trunk en ' + n.sw1 + ' y en ' + n.sw2 + ' y compara la columna Native. Corrige con: switchport trunk native vlan 1.'],
    solution: [{ devId: 'SW1', cmds: ['enable', 'configure terminal', 'interface Gi0/2', 'switchport trunk native vlan 1', 'end'] }],
    apply: (d) => { const p = d.SW1.interfaces['Gi0/2']; p.mode = 'trunk'; p.nativeVlan = vv } })

  F.push({ key: 'encap-mismatch', design: null, title: 'Encapsulación del troncal incorrecta', category: 'VLAN / Trunking 802.1Q',
    devId: 'SW2', port: 'Gi0/1',
    symptom: 'Ventas y Soporte perdieron toda la conexión con el resto de la red; el enlace entre aparatos se ve anaranjado.',
    hints: ['Los dos extremos del enlace troncal deben usar el mismo encapsulado (802.1Q / dot1q).',
      'Ejecuta show interfaces trunk: un extremo muestra una encapsulación distinta. Corrige con: switchport trunk encapsulation dot1q.'],
    solution: [{ devId: 'SW2', cmds: ['enable', 'configure terminal', 'interface Gi0/1', 'switchport trunk encapsulation dot1q', 'end'] }],
    apply: (d) => { const p = d.SW2.interfaces['Gi0/1']; p.mode = 'trunk'; p.encap = 'isl' } })

  F.push({ key: 'nat-swapped', design: null, title: 'NAT aplicado en interfaces incorrectas', category: 'Servicios IP (NAT)',
    devId: 'R1', port: null,
    symptom: 'La red interna funciona (todos se ven entre sí y con los servidores), pero nadie puede abrir Internet.',
    hints: ['El tráfico llega al router, pero NAT no está traduciendo las direcciones internas.',
      'Ejecuta show running-config en ' + n.r1 + ': los comandos ip nat inside / ip nat outside están en las interfaces equivocadas. La LAN debe ser inside y la WAN outside.'],
    solution: [{ devId: 'R1', cmds: ['enable', 'configure terminal', 'interface Gi0/0', 'ip nat outside', 'interface Gi0/1', 'ip nat inside', 'end'] }],
    apply: (d) => { d.R1.interfaces['Gi0/0'].natRole = 'inside'; d.R1.interfaces['Gi0/1'].natRole = 'outside' } })

  F.push({ key: 'pc-wrong-gw', design: null, title: 'Puerta de enlace incorrecta en la PC', category: 'Configuración IP / Subredes',
    devId: 'PC2', port: null,
    symptom: 'La PC de Ventas tiene su dirección y máscara correctas, pero no sale a nada fuera de su red; las demás áreas sí navegan.',
    hints: ['El equipo tiene dirección válida pero no sabe por dónde salir: revisa su puerta de enlace.',
      'Abre la consola de la PC de Ventas y usa ipconfig: la puerta de enlace debe ser ' + nets.ventas.gw + '. Corrige con: ip ' + s.pcs.ventas + ' ' + M24 + ' ' + nets.ventas.gw + '.'],
    solution: [{ devId: 'PC2', cmds: ['ip ' + s.pcs.ventas + ' ' + M24 + ' ' + nets.ventas.gw] }],
    apply: (d) => { d.PC2.pc = { ip: s.pcs.ventas, mask: M24, gw: '10.' + B + '.20.254' } } })

  if (s.topo.srv) {
    F.push({ key: 'srv-factory', design: null, title: 'Servidor restablecido de fábrica', category: 'Configuración IP / Subredes',
      devId: 'SRV1', port: null,
      symptom: 'El servidor de aplicaciones dejó de responder tras un corte; quedó con la configuración de fábrica (dirección por defecto).',
      hints: ['El servidor tiene enlace pero su dirección no pertenece a la red del sitio: parece recién restablecido.',
        'Abre la consola del servidor y usa ipconfig; asígnale la dirección del plan: ip 10.' + B + '.10.20 ' + M24 + ' ' + nets.admin.gw + '.'],
      solution: [{ devId: 'SRV1', cmds: ['ip 10.' + B + '.10.20 ' + M24 + ' ' + nets.admin.gw] }],
      apply: (d) => { d.SRV1.pc = { ip: '192.168.0.20', mask: M24, gw: '192.168.0.1' } } })
    F.push({ key: 'srv-dupip', design: null, title: 'IP duplicada del servidor', category: 'Configuración IP / Subredes',
      devId: 'SRV1', port: null,
      symptom: 'El servidor responde de forma intermitente y la PC de Administración "choca": alguien duplicó direcciones.',
      hints: ['Dos equipos de la misma red tienen la misma dirección IP; eso rompe la comunicación de ambos.',
        'Revisa con ipconfig: el servidor debe usar 10.' + B + '.10.20 (no la de PC-ADMIN). Corrige con: ip 10.' + B + '.10.20 ' + M24 + ' ' + nets.admin.gw + '.'],
      solution: [{ devId: 'SRV1', cmds: ['ip 10.' + B + '.10.20 ' + M24 + ' ' + nets.admin.gw] }],
      apply: (d) => { d.SRV1.pc = { ip: s.pcs.admin, mask: M24, gw: nets.admin.gw } } })
    F.push({ key: 'srv-offsubnet', design: null, title: 'Servidor fuera del segmento', category: 'Configuración IP / Subredes',
      devId: 'SRV1', port: null,
      symptom: 'El servidor tiene dirección, pero quedó en un segmento que no corresponde al sitio y nadie lo alcanza.',
      hints: ['La dirección del servidor no está en la subred del sitio; su puerta de enlace queda fuera de su red.',
        'Usa ipconfig en el servidor: debe ser 10.' + B + '.10.20 ' + M24 + ' con gateway ' + nets.admin.gw + '.'],
      solution: [{ devId: 'SRV1', cmds: ['ip 10.' + B + '.10.20 ' + M24 + ' ' + nets.admin.gw] }],
      apply: (d) => { d.SRV1.pc = { ip: '10.' + B + '.99.50', mask: M24, gw: nets.admin.gw } } })
  }
  if (s.topo.cam) {
    F.push({ key: 'cam-factory', design: null, title: 'Cámara restablecida de fábrica', category: 'Configuración IP / Subredes',
      devId: 'CAM1', port: null,
      symptom: 'La cámara de seguridad se mojó y al secarse volvió con la configuración de fábrica; ya no graba.',
      hints: ['La cámara tiene enlace pero su dirección no es la del sitio (quedó por defecto): parece recién restablecida.',
        'Abre la consola de la cámara y usa ipconfig; asígnale su dirección del plan: ip 10.' + B + '.30.20 ' + M24 + ' ' + nets.soporte.gw + '.'],
      solution: [{ devId: 'CAM1', cmds: ['ip 10.' + B + '.30.20 ' + M24 + ' ' + nets.soporte.gw] }],
      apply: (d) => { d.CAM1.pc = { ip: '192.168.0.50', mask: M24, gw: '192.168.0.1' } } })
    F.push({ key: 'cam-dupip', design: null, title: 'IP duplicada de la cámara', category: 'Configuración IP / Subredes',
      devId: 'CAM1', port: null,
      symptom: 'La cámara deja de grabar a ratos y una computadora de Soporte empezó a fallar: hay direcciones repetidas en esa red.',
      hints: ['Dos equipos comparten la misma dirección IP en la misma red; ambos pierden conectividad.',
        'Compara con ipconfig: la cámara debe usar 10.' + B + '.30.20 (no la de la PC de Soporte). Corrige con: ip 10.' + B + '.30.20 ' + M24 + ' ' + nets.soporte.gw + '.'],
      solution: [{ devId: 'CAM1', cmds: ['ip 10.' + B + '.30.20 ' + M24 + ' ' + nets.soporte.gw] }],
      apply: (d) => { d.CAM1.pc = { ip: s.pcs.soporte, mask: M24, gw: nets.soporte.gw } } })
    F.push({ key: 'cam-offsubnet', design: null, title: 'Cámara fuera del segmento', category: 'Configuración IP / Subredes',
      devId: 'CAM1', port: null,
      symptom: 'La cámara de seguridad quedó inalcanzable: tiene dirección, pero en un segmento que no es el de las cámaras.',
      hints: ['La dirección de la cámara no pertenece a la subred del sitio; su puerta de enlace queda fuera de su red.',
        'Usa ipconfig en la cámara: debe ser 10.' + B + '.30.20 ' + M24 + ' con gateway ' + nets.soporte.gw + '.'],
      solution: [{ devId: 'CAM1', cmds: ['ip 10.' + B + '.30.20 ' + M24 + ' ' + nets.soporte.gw] }],
      apply: (d) => { d.CAM1.pc = { ip: '10.' + B + '.99.60', mask: M24, gw: nets.soporte.gw } } })
    F.push({ key: 'cam-cut', design: null, title: 'Cable de la cámara cortado', category: 'Cableado',
      devId: 'CAM1', port: null,
      symptom: 'La cámara de la entrada dejó de grabar; en el diagrama el cable aparece rojo, como si estuviera dañado.',
      hints: ['No es un apagado del puerto: el enlace aparece con el cable "roto". Hay que reemplazar el cable.',
        'Activa 🔌 Cablear, haz clic sobre el cable rojo de la cámara para retirarlo y vuelve a conectar SW1 Gi0/6 con la cámara.'],
      solution: [{ devId: 'CAM1', cmds: ['# Con 🔌 Cablear: clic en el cable rojo de la cámara para retirarlo y reconéctalo entre SW1 Gi0/6 y CAM1.'] }],
      repair: (lab) => { const l = lab.links.find((x) => x.id === 'L11'); if (l) l.broken = false },
      apply: (d, links) => { const l = links.find((x) => x.id === 'L11'); if (l) l.broken = true } })
  }

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
  let out
  if (sc && sc.faultKeys) {
    const rnd = mulberry32((spec.seed >>> 0) ^ 0x5bf03635)
    const pool = makeFaults(spec, rnd)
    const faults = sc.faultKeys.map((k) => pool.find((f) => f.key === k)).filter(Boolean)
    out = (faults.length === sc.faultKeys.length) ? faults : chooseFaults(spec)
  } else {
    out = chooseFaults(spec)
  }
  if (sc && sc.task) out = out.concat([typeof sc.task === 'function' ? sc.task(spec) : sc.task])
  return out
}
