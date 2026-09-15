// Tests del modo CONSTRUCCIÓN: topología dinámica, cableado por puertos y configuración por CLI.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SCENARIOS } from '../src/lib/labGenerator.js'
import { generateConstructionLab } from '../src/lib/buildGenerator.js'
import { evaluateGoals, connectPorts, freePorts, recompute } from '../src/lib/engine.js'
import { execCommand } from '../src/lib/cli.js'

function ctxFor(lab) { return lab.ctx || (lab.ctx = { lab, sessions: {} }) }
function run(lab, devId, cmds) {
  const ctx = ctxFor(lab)
  for (const cmd of cmds) execCommand(ctx, devId, cmd)
  recompute(lab)
}
function wire(lab, aDev, aPort, bDev, bPort) {
  const r = connectPorts(lab, { dev: aDev, port: aPort }, { dev: bDev, port: bPort })
  assert.equal(r.ok, true, 'no se pudo cablear ' + aDev + ' ↔ ' + bDev)
}
const scenario = (key) => SCENARIOS.find((s) => s.key === key)

function addReturnRoute(lab, b) {
  if (lab.spec.wanDesign === 'ospf') {
    run(lab, 'SW1', ['enable', 'configure terminal', 'router ospf 1', 'network ' + b.vnet + ' 0.0.0.255 area 0', 'end'])
  } else {
    run(lab, 'R1', ['enable', 'configure terminal', 'ip route ' + b.vnet + ' 255.255.255.0 ' + lab.spec.nets.transit.sw1, 'end'])
  }
}

test('laboratorio de construcción (edificio) nace incompleto', () => {
  const lab = generateConstructionLab(555, scenario('c-edificio'))
  assert.equal(lab.mode, 'build')
  assert.ok(lab.order.includes('SWB'))
  assert.ok(lab.build.pcs.length >= 3)
  const res = evaluateGoals(lab)
  assert.ok(res.some((g) => !g.res.ok), 'debe haber tareas pendientes al inicio')
  assert.ok(res.some((g) => g.id === 'c-cable' && !g.res.ok))
  assert.ok(res.some((g) => g.id === 'c-net' && !g.res.ok))
})

test('cablear y configurar un edificio nuevo cumple TODOS los objetivos', () => {
  const lab = generateConstructionLab(555, scenario('c-edificio'))
  const b = lab.build
  wire(lab, 'SW1', 'Gi0/5', 'SWB', 'Gi0/1')
  const pcPorts = {}
  b.pcs.forEach((p, i) => {
    const free = freePorts(lab, 'SWB').filter((x) => x !== 'Gi0/1')
    const port = free[0]
    pcPorts[p.id] = port
    wire(lab, 'SWB', port, p.id, 'NIC')
  })

  run(lab, 'SW1', ['enable', 'configure terminal', 'vlan ' + b.vlan, 'name ' + b.vlanName, 'exit',
    'interface Gi0/5', 'switchport mode trunk', 'switchport trunk allowed vlan ' + b.vlan,
    'interface Vlan' + b.vlan, 'ip address ' + b.gw + ' 255.255.255.0', 'end'])
  run(lab, 'SWB', ['enable', 'configure terminal', 'vlan ' + b.vlan, 'name ' + b.vlanName, 'exit',
    'interface Gi0/1', 'switchport mode trunk', 'switchport trunk allowed vlan ' + b.vlan, 'end'])
  for (const p of b.pcs) {
    run(lab, 'SWB', ['enable', 'configure terminal', 'interface ' + pcPorts[p.id], 'switchport mode access', 'switchport access vlan ' + b.vlan, 'end'])
  }
  addReturnRoute(lab, b)

  const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
  assert.deepEqual(failed.map((g) => g.label + ' :: ' + g.res.reason), [])
})

test('laboratorio de construcción (piso) se resuelve cableando a puertos libres del switch existente', () => {
  const lab = generateConstructionLab(99, scenario('c-piso'))
  const b = lab.build
  assert.equal(b.accSw, 'SW2')
  assert.equal(lab.devices.SWB, undefined)
  const pcPorts = {}
  for (const p of b.pcs) {
    const free = freePorts(lab, 'SW2')
    pcPorts[p.id] = free[0]
    wire(lab, 'SW2', free[0], p.id, 'NIC')
  }
  run(lab, 'SW1', ['enable', 'configure terminal', 'vlan ' + b.vlan, 'name ' + b.vlanName, 'exit',
    'interface Gi0/2', 'switchport trunk allowed vlan add ' + b.vlan,
    'interface Vlan' + b.vlan, 'ip address ' + b.gw + ' 255.255.255.0', 'end'])
  run(lab, 'SW2', ['enable', 'configure terminal', 'vlan ' + b.vlan, 'name ' + b.vlanName, 'exit',
    'interface Gi0/1', 'switchport trunk allowed vlan add ' + b.vlan, 'end'])
  for (const p of b.pcs) {
    run(lab, 'SW2', ['enable', 'configure terminal', 'interface ' + pcPorts[p.id], 'switchport mode access', 'switchport access vlan ' + b.vlan, 'end'])
  }
  addReturnRoute(lab, b)
  const failed = evaluateGoals(lab).filter((g) => !g.res.ok)
  assert.deepEqual(failed.map((g) => g.label + ' :: ' + g.res.reason), [])
})

test('cableado: no se puede conectar dos PCs ni reutilizar un puerto', () => {
  const lab = generateConstructionLab(7, scenario('c-edificio'))
  const bad = connectPorts(lab, { dev: 'PCB1', port: 'NIC' }, { dev: 'PCB2', port: 'NIC' })
  assert.equal(bad.ok, false)
  wire(lab, 'SW1', 'Gi0/5', 'SWB', 'Gi0/1')
  const again = connectPorts(lab, { dev: 'SW1', port: 'Gi0/5' }, { dev: 'SWB', port: 'Gi0/2' })
  assert.equal(again.ok, false, 'Gi0/5 ya está en uso')
  assert.ok(!freePorts(lab, 'SW1').includes('Gi0/5'))
})

test('los escenarios de construcción exponen spec.build y su historia se renderiza', () => {
  for (const key of ['c-edificio', 'c-piso', 'c-edificio-avz']) {
    for (const seed of [1, 42, 424242, 3140732973, 2257126979]) {
      const lab = generateConstructionLab(seed, scenario(key))
      assert.ok(lab.spec.build, 'spec.build debe existir para que la historia no falle')
      assert.doesNotThrow(() => lab.scenario.story(lab.spec), 'story() no debe lanzar (regresión de pantalla en blanco)')
      assert.ok(lab.build.pcs.length >= 3)
    }
  }
})

test('cableado: el tipo de cable se valida (directo switch-PC, cruzado switch-switch)', () => {
  const lab = generateConstructionLab(11, scenario('c-edificio'))
  assert.equal(connectPorts(lab, { dev: 'SW1', port: 'Gi0/5' }, { dev: 'SWB', port: 'Gi0/1' }, 'directo').ok, false)
  assert.equal(connectPorts(lab, { dev: 'SW1', port: 'Gi0/5' }, { dev: 'SWB', port: 'Gi0/1' }, 'cruzado').ok, true)
  assert.equal(connectPorts(lab, { dev: 'SWB', port: 'Gi0/2' }, { dev: 'PCB1', port: 'NIC' }, 'cruzado').ok, false)
  assert.equal(connectPorts(lab, { dev: 'SWB', port: 'Gi0/2' }, { dev: 'PCB1', port: 'NIC' }, 'directo').ok, true)
})

test('los equipos del laboratorio de construcción no se amontonan', () => {
  for (const key of ['c-edificio', 'c-piso', 'c-edificio-avz']) {
    for (const seed of [1, 99, 555, 3140732973, 2257126979]) {
      const lab = generateConstructionLab(seed, scenario(key))
      assert.ok(lab.viewBox, 'el lab de construcción debe declarar su viewBox')
      const boxes = lab.order.map((id) => { const p = lab.positions[id]; return { id, x1: p.x - 68, x2: p.x + 68, y1: p.y - 28, y2: p.y + 58 } })
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j]
          const overlap = a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
          assert.equal(overlap, false, key + ' seed ' + seed + ': ' + a.id + ' y ' + b.id + ' se enciman')
        }
      }
    }
  }
})

test('reiniciar la construcción deja la topología en blanco', () => {
  const lab = generateConstructionLab(7, scenario('c-edificio'))
  wire(lab, 'SW1', 'Gi0/5', 'SWB', 'Gi0/1')
  assert.ok(freePorts(lab, 'SW1').length < 4)
  const fresh = generateConstructionLab(lab.spec.seed, lab.scenario)
  assert.equal(fresh.links.length, lab.links.length - 1)
  assert.ok(freePorts(fresh, 'SW1').includes('Gi0/5'))
})
