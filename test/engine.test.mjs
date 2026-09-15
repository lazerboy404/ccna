// Tests del motor, el generador y la CLI (node --test). Sin dependencias externas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERNET } from '../src/lib/utils.js'
import { SCENARIOS, generateSpec, buildDevices, buildLinks, buildGoals, scenarioFaults } from '../src/lib/labGenerator.js'
import { recompute, evaluateGoals, pingSim } from '../src/lib/engine.js'
import { execCommand } from '../src/lib/cli.js'

function buildLabFor(sc, seed) {
  const spec = generateSpec(seed, sc)
  const faults = scenarioFaults(spec, sc)
  const devices = buildDevices(spec)
  const links = buildLinks(spec)
  faults.forEach((f) => f.apply(devices, links))
  const lab = { spec, scenario: sc, devices, links, faults, goals: buildGoals(spec), hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null }
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
