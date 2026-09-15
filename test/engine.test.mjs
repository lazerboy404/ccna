// Tests del motor, el generador y la CLI (node --test). Sin dependencias externas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERNET } from '../src/lib/utils.js'
import { SCENARIOS, generateSpec, buildDevices, buildLinks, buildGoals, scenarioFaults, TOPO_ORDER } from '../src/lib/labGenerator.js'
import { generateConstructionLab } from '../src/lib/buildGenerator.js'
import { recompute, evaluateGoals, pingSim, simRequest, linkBlocked, positionsFor } from '../src/lib/engine.js'
import { execCommand } from '../src/lib/cli.js'

function buildLabFor(sc, seed) {
  const spec = generateSpec(seed, sc)
  const faults = scenarioFaults(spec, sc)
  const devices = buildDevices(spec)
  const links = buildLinks(spec)
  if (sc.setup) sc.setup(spec, devices, links)
  faults.forEach((f) => { if (f.apply) f.apply(devices, links) })
  let goals = buildGoals(spec)
  if (sc.extraGoals) goals = goals.concat(sc.extraGoals(spec))
  const lab = { spec, scenario: sc, devices, links, faults, goals, hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null }
  lab.order = TOPO_ORDER.filter((id) => !!devices[id]).concat(Object.keys(devices).filter((id) => !TOPO_ORDER.includes(id)))
  lab.positions = positionsFor(spec)
  recompute(lab)
  return lab
}
function run(lab, devId, cmds) {
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  for (const cmd of cmds) if (!cmd.trim().startsWith('#')) execCommand(ctx, devId, cmd)
  recompute(lab)
}
function solve(lab) {
  for (const f of lab.faults) {
    if (f.repair) f.repair(lab)
    for (const st of f.solution) run(lab, st.devId, st.cmds)
  }
}
function plainLab(seed, sc) {
  const spec = generateSpec(seed, sc || SCENARIOS[0])
  const lab = { spec, scenario: sc || SCENARIOS[0], devices: buildDevices(spec), links: buildLinks(spec), faults: [], goals: buildGoals(spec), hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null }
  recompute(lab)
  return lab
}

test('cada escenario se resuelve con su solución exacta', () => {
  for (const sc of SCENARIOS) {
    for (const seed of [1, 777, 424242]) {
      const lab = buildLabFor(sc, seed)
      const broken = evaluateGoals(lab).filter((g) => !g.res.ok)
      assert.ok(broken.length > 0, sc.key + ' seed ' + seed + ': no generó ninguna falla visible')
      solve(lab)
      const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
      assert.deepEqual(failed.map((g) => g.label + ' :: ' + g.res.reason), [], sc.key + ' seed ' + seed + ': quedaron objetivos sin resolver')
    }
  }
})

test('la red base (sin fallas) tiene todos los objetivos OK', () => {
  const lab = plainLab(2024)
  const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
  assert.deepEqual(failed.map((g) => g.label), [])
})

test('la falla acl-block solo rompe el tráfico de Soporte', () => {
  const sc = SCENARIOS.find((x) => x.key === 'i-acl')
  const lab = buildLabFor(sc, 777)
  const g = (id) => evaluateGoals(lab).find((x) => x.id === id).res.ok
  assert.equal(g('g6'), false, 'PC3 → Internet debería fallar por la ACL')
  assert.equal(g('g5'), true, 'PC1 → Internet no debe verse afectado')
  assert.equal(g('g4'), true, 'PC2 → PC3 es L2 local, no pasa por la ACL')
  solve(lab)
  assert.equal(evaluateGoals(lab).every((x) => x.res.ok), true)
})

test('la falla port-security deja el puerto en err-disabled y se recupera con shutdown/no shutdown', () => {
  const sc = SCENARIOS.find((x) => x.key === 'i-portsecurity')
  const lab = buildLabFor(sc, 777)
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, false)
  const ifc = lab.devices.SW2.interfaces['Gi0/3']
  assert.equal(ifc.security.state, 'err-disabled')
  assert.equal(ifc.status, 'up')
  solve(lab)
  assert.equal(ifc.security.state, 'secure-up')
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, true)
})

test('CLI: access-list + ip access-group filtra y se revierte', () => {
  const lab = plainLab(321)
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, true)
  const soporte = lab.spec.nets.soporte.net
  run(lab, 'R1', ['enable', 'configure terminal',
    'access-list 110 deny ip ' + soporte + ' 0.0.0.255 any',
    'access-list 110 permit ip any any',
    'interface Gi0/1', 'ip access-group 110 in', 'end'])
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, false, 'la ACL debe bloquear a Soporte')
  assert.equal(pingSim(lab, 'PC2', INTERNET).ok, true, 'Ventas no debe verse afectado')
  run(lab, 'R1', ['enable', 'configure terminal', 'interface Gi0/1', 'no ip access-group 110 in', 'end'])
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, true)
})

test('CLI: la ACL tiene deny implícito al final', () => {
  const lab = plainLab(322)
  run(lab, 'R1', ['enable', 'configure terminal',
    'access-list 120 deny ip 10.0.0.0 0.0.0.255 any',
    'interface Gi0/1', 'ip access-group 120 in', 'end'])
  assert.equal(pingSim(lab, 'PC3', INTERNET).ok, false, 'una ACL sin permit explícito debe denegar por defecto')
})

test('fallas de servidor y cámara rompen su objetivo y se resuelven', () => {
  for (const [key, brokenId] of [['i-servidor', 'g9'], ['i-camara', 'g11']]) {
    const sc = SCENARIOS.find((s) => s.key === key)
    const lab = buildLabFor(sc, 777)
    const before = evaluateGoals(lab).find((g) => g.id === brokenId)
    assert.equal(before.res.ok, false, key + ': el objetivo ' + brokenId + ' debería fallar')
    solve(lab)
    const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
    assert.deepEqual(failed.map((g) => g.label), [], key + ': quedó algo sin resolver')
  }
})

test('causas nuevas: fábrica, IP duplicada, fuera de segmento, gateway y cable cortado', () => {
  const cases = [
    ['i-cam-fabrica', 'g11'],
    ['i-cam-dup', 'g11'],
    ['i-cam-fuera', 'g11'],
    ['i-cam-cable', 'g11'],
    ['i-srv-fabrica', 'g9'],
    ['i-gw-malo', 'g4'],
  ]
  for (const [key, brokenId] of cases) {
    const sc = SCENARIOS.find((s) => s.key === key)
    const lab = buildLabFor(sc, 777)
    const before = evaluateGoals(lab).find((g) => g.id === brokenId)
    assert.equal(before.res.ok, false, key + ': el objetivo ' + brokenId + ' debería fallar')
    solve(lab)
    const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
    assert.deepEqual(failed.map((g) => g.label), [], key + ': quedó algo sin resolver')
  }
})

test('troubleshooting de troncal: VLAN nativa y encapsulación 802.1Q', () => {
  for (const key of ['i-native-vlan', 'i-encap']) {
    const sc = SCENARIOS.find((s) => s.key === key)
    const lab = buildLabFor(sc, 42)
    assert.equal(evaluateGoals(lab).find((g) => g.id === 'g2').res.ok, false, key + ': Ventas debería fallar')
    solve(lab)
    assert.deepEqual(evaluateGoals(lab).filter((g) => !g.res.ok).map((g) => g.label), [], key + ': quedó algo sin resolver')
  }
})

test('CLI: show interface switchport y copy running-config startup-config', () => {
  const lab = plainLab(500)
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  run(lab, 'SW1', ['enable', 'configure terminal', 'interface Gi0/2', 'switchport trunk native vlan 20', 'switchport trunk encapsulation dot1q', 'end'])
  run(lab, 'SW1', ['show interface Gi0/2 switchport'])
  assert.ok(ctx.sessions.SW1.out.some((e) => /Native Mode VLAN: 20/.test(e.t)), 'show interface switchport debe mostrar la VLAN nativa')
  run(lab, 'SW1', ['copy running-config startup-config'])
  assert.ok(ctx.sessions.SW1.out.some((e) => /\[OK\]/.test(e.t)), 'copy run start debe confirmar [OK]')
})

test('NAT: inside/outside mal aplicadas rompe Internet y se corrige', () => {
  const sc = SCENARIOS.find((s) => s.key === 'i-nat')
  const lab = buildLabFor(sc, 777)
  assert.equal(evaluateGoals(lab).find((g) => g.id === 'g5').res.ok, false, 'PC1 → Internet debe fallar por NAT')
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  run(lab, 'R1', ['show ip nat translations'])
  assert.ok(ctx.sessions.R1.out.some((e) => /outside/.test(e.t)), 'show ip nat translations debe mostrar las interfaces')
  solve(lab)
  assert.deepEqual(evaluateGoals(lab).filter((g) => !g.res.ok).map((g) => g.label), [])
})

test('ejercicios de configuración (200-301): acceso/SSH, NTP y DHCP', () => {
  for (const key of ['i-acceso-seguro', 'i-ntp', 'i-dhcp']) {
    const sc = SCENARIOS.find((s) => s.key === key)
    const lab = buildLabFor(sc, 777)
    assert.ok(evaluateGoals(lab).some((g) => !g.res.ok), key + ': debe empezar con tareas pendientes')
    solve(lab)
    assert.deepEqual(evaluateGoals(lab).filter((g) => !g.res.ok).map((g) => g.label), [], key + ': quedó algo sin resolver')
  }
})

test('CLI: show cdp/lldp neighbors, show ntp y show ip dhcp binding', () => {
  const lab = plainLab(600)
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  run(lab, 'SW1', ['show cdp neighbors'])
  assert.ok(ctx.sessions.SW1.out.some((e) => /R1|Router/.test(e.t)), 'show cdp neighbors debe listar vecinos')
  run(lab, 'R1', ['enable', 'configure terminal', 'ntp server 10.0.0.1', 'ip dhcp pool TEST', 'network 10.0.0.0 255.255.255.0', 'default-router 10.0.0.1', 'exit', 'end'])
  run(lab, 'R1', ['show ntp status'])
  assert.ok(ctx.sessions.R1.out.some((e) => /10\.0\.0\.1/.test(e.t)), 'show ntp debe listar el servidor')
  run(lab, 'R1', ['show ip dhcp binding'])
  assert.ok(ctx.sessions.R1.out.some((e) => /TEST/.test(e.t)), 'show ip dhcp binding debe listar el pool')
})

test('ACL extendida con puerto (HTTP 80): solo el host autorizado entra', () => {
  const sc = SCENARIOS.find((s) => s.key === 'i-acl-web')
  const lab = buildLabFor(sc, 777)
  const srvIp = '10.' + lab.spec.B + '.10.20'
  assert.equal(simRequest(lab, 'PC1', srvIp, 'tcp', 80).ok, true, 'PC-ADMIN debe poder (sin ACL aún)')
  assert.equal(simRequest(lab, 'PC2', srvIp, 'tcp', 80).ok, true, 'al inicio todos pueden (sin ACL)')
  solve(lab)
  assert.equal(simRequest(lab, 'PC2', srvIp, 'tcp', 80).ok, false, 'tras la ACL, Ventas no debe poder abrir HTTP')
  assert.equal(simRequest(lab, 'PC1', srvIp, 'tcp', 80).ok, true, 'PC-ADMIN sigue pudiendo')
  assert.equal(pingSim(lab, 'PC2', srvIp).ok, true, 'el resto del tráfico sigue permitido')
  assert.deepEqual(evaluateGoals(lab).filter((g) => !g.res.ok).map((g) => g.label), [])
})

test('nuevos temas 200-301: STP guards, DHCP snooping/DAI, IPv6 y EtherChannel', () => {
  for (const key of ['i-stp-guards', 'i-l2-seguridad', 'i-ipv6', 'i-etherchannel']) {
    const sc = SCENARIOS.find((s) => s.key === key)
    const lab = buildLabFor(sc, 777)
    assert.ok(evaluateGoals(lab).some((g) => !g.res.ok), key + ': debe empezar con tareas pendientes')
    solve(lab)
    assert.deepEqual(evaluateGoals(lab).filter((g) => !g.res.ok).map((g) => g.label), [], key + ': quedó algo sin resolver')
  }
})

test('EtherChannel: sin channel-group, STP bloquea el segundo enlace; al agruparlo, ambos quedan activos', () => {
  const sc = SCENARIOS.find((s) => s.key === 'i-etherchannel')
  const lab = buildLabFor(sc, 777)
  const pair = () => lab.links.filter((x) => x.kind === 'eth' && x.a.dev === 'SW1' && x.b.dev === 'SW2')
  assert.equal(pair().length, 2, 'deben existir dos enlaces entre los switches')
  assert.ok(pair().some((x) => linkBlocked(lab, x)), 'sin EtherChannel uno debe quedar bloqueado')
  solve(lab)
  assert.ok(pair().every((x) => !linkBlocked(lab, x)), 'con EtherChannel ambos deben estar activos')
})

test('CLI: show etherchannel, show ipv6 interface/route y show ip dhcp snooping', () => {
  const lab = plainLab(700)
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  run(lab, 'SW1', ['enable', 'configure terminal', 'interface Gi0/1', 'channel-group 1 mode active', 'end'])
  run(lab, 'SW1', ['show etherchannel summary'])
  assert.ok(ctx.sessions.SW1.out.some((e) => /Port-channel1/.test(e.t)), 'show etherchannel debe mostrar el Po1')
  run(lab, 'R1', ['enable', 'configure terminal', 'ipv6 unicast-routing', 'interface Gi0/1', 'ipv6 address 2001:DB8:B:B1::1/64', 'end'])
  run(lab, 'R1', ['show ipv6 interface brief'])
  assert.ok(ctx.sessions.R1.out.some((e) => /2001:db8:b:b1::1/.test(e.t)), 'show ipv6 interface debe mostrar la dirección')
  run(lab, 'SW2', ['enable', 'configure terminal', 'ip dhcp snooping', 'ip dhcp snooping vlan 30', 'end'])
  run(lab, 'SW2', ['show ip dhcp snooping'])
  assert.ok(ctx.sessions.SW2.out.some((e) => /snooping/i.test(e.t)), 'show ip dhcp snooping debe mostrar el estado')
})

test('pingSim devuelve el trayecto (hops) para animar el ping', () => {
  const lab = plainLab(321)
  const r = pingSim(lab, 'PC3', INTERNET)
  assert.equal(r.ok, true)
  assert.ok(Array.isArray(r.hops), 'debe devolver hops')
  assert.equal(r.hops[0], 'PC3')
  assert.ok(r.hops.includes('SW1') && r.hops.includes('R1'), 'el trayecto debe pasar por SW1 y R1')
  const r2 = pingSim(lab, 'PC1', lab.spec.nets.admin.gw)
  assert.ok(r2.hops.includes('SW1'))
})

test('posiciones: ningún equipo ni placa se encima ni sale del lienzo', () => {
  const TL = { isp: 'Internet', firewall: 'Firewall', router: 'Router', l3switch: 'Switch L3', l2switch: 'Switch L2', ap: 'Access Point', server: 'Servidor', camera: 'Cámara IP', wireless: 'Cliente WiFi', pc: 'PC' }
  const plateW = (d) => Math.max(d.name.length * 6.8, (d.pc ? d.pc.ip : (TL[d.type] || 'PC')).length * 5.8) + 14
  for (const sc of SCENARIOS) {
    for (const seed of [1, 42, 777, 424242, 3140732973]) {
      const lab = sc.build ? generateConstructionLab(seed, sc) : buildLabFor(sc, seed)
      const vb = (lab.viewBox || '0 0 960 540').split(' ')
      const W = +vb[2] || 960, H = +vb[3] || 540
      const list = lab.order.map((id) => ({ d: lab.devices[id], p: lab.positions[id], w: plateW(lab.devices[id]) }))
      for (const e of list) {
        assert.ok(e.p.x - e.w / 2 >= 0 && e.p.x + e.w / 2 <= W, sc.key + ' seed ' + seed + ': ' + e.d.name + ' sale del lienzo (x)')
        assert.ok(e.p.y - 28 >= 0 && e.p.y + 58 <= H, sc.key + ' seed ' + seed + ': ' + e.d.name + ' sale del lienzo (y)')
      }
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        const ov = Math.abs(a.p.x - b.p.x) < (a.w + b.w) / 2 && Math.abs(a.p.y - b.p.y) < 78
        assert.equal(ov, false, sc.key + ' seed ' + seed + ': ' + a.d.name + ' y ' + b.d.name + ' se enciman')
      }
    }
  }
})

test('CLI: show access-lists y show port-security no fallan', () => {
  const lab = plainLab(323)
  const ctx = lab.ctx || (lab.ctx = { lab, sessions: {} })
  run(lab, 'R1', ['enable', 'configure terminal', 'access-list 110 permit ip any any', 'interface Gi0/1', 'ip access-group 110 out', 'end'])
  run(lab, 'R1', ['show access-lists'])
  assert.ok(ctx.sessions.R1.out.some((e) => /access list 110/.test(e.t)), 'show access-lists debe listar la ACL 110')
  run(lab, 'SW2', ['enable', 'configure terminal', 'interface Gi0/3', 'switchport port-security', 'switchport port-security violation restrict', 'end'])
  run(lab, 'SW2', ['show port-security'])
  assert.ok(ctx.sessions.SW2.out.some((e) => /Gi0\/3/.test(e.t)), 'show port-security debe listar Gi0/3')
})
