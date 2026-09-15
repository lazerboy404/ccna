// Estado global en tiempo real del laboratorio: generador, CLI, validación y persistencia
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mulberry32, hasCli } from '../lib/utils.js'
import { generateSpec, pickScenario, buildDevices, buildLinks, buildGoals, scenarioFaults, TOPO_ORDER } from '../lib/labGenerator.js'
import { generateConstructionLab } from '../lib/buildGenerator.js'
import { recompute, evaluateGoals, connectPorts, positionsFor } from '../lib/engine.js'
import { execCommand, ensureConsole } from '../lib/cli.js'

const SKEY = 'ccna_sim_stats_v1'

function loadStats() {
  try {
    const raw = localStorage.getItem(SKEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object') return Object.assign({ streak: 0, best: 0, solved: 0, attempts: 0, bestScore: 0, history: [], pref: 'any' }, p)
    }
  } catch (e) { /* estado inicial */ }
  return { streak: 0, best: 0, solved: 0, attempts: 0, bestScore: 0, history: [], pref: 'any' }
}
function saveStats(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch (e) { /* sin storage disponible */ } }
const randomSeed = () => ((Date.now() ^ Math.floor(Math.random() * 2147483647)) >>> 0)

export function buildLab(seed, pref) {
  const rnd0 = mulberry32((seed >>> 0) ^ 0x7eed1)
  const sc = pickScenario(rnd0, pref)
  if (sc.build) return generateConstructionLab(seed >>> 0, sc)
  const spec = generateSpec(seed >>> 0, sc)
  const faults = scenarioFaults(spec, sc)
  const devices = buildDevices(spec)
  faults.forEach((f) => f.apply(devices))
  const lab = { spec, scenario: sc, devices, links: buildLinks(spec), faults, goals: buildGoals(spec), hintsUsed: 0, sawSolution: false, solved: false, attempted: false, eng: null }
  lab.order = TOPO_ORDER.filter((id) => !!devices[id]).concat(Object.keys(devices).filter((id) => !TOPO_ORDER.includes(id)))
  lab.positions = positionsFor(spec)
  recompute(lab)
  return lab
}

const NetworkContext = createContext(null)

export function useNetwork() { return useContext(NetworkContext) }

export function NetworkProvider({ children }) {
  const sessionsRef = useRef({})
  const [stats, setStats] = useState(loadStats)
  const [lab, setLab] = useState(() => buildLab(randomSeed(), loadStats().pref))
  const [tick, setTick] = useState(0)
  const [active, setActiveState] = useState(null)
  const [validation, setValidation] = useState(null)
  const [toasts, setToasts] = useState([])
  const [cabling, setCabling] = useState(false)

  const bump = useCallback(() => setTick((t) => t + 1), [])
  const toast = useCallback((msg, kind) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-3), { id, msg, kind: kind || '' }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  useEffect(() => { saveStats(stats) }, [stats])

  const goalsResults = useMemo(() => evaluateGoals(lab), [lab, tick])

  const ctx = useMemo(() => ({ lab, sessions: sessionsRef.current }), [lab])

  const setActive = useCallback((id) => {
    if (id) {
      const d = lab.devices[id]
      if (!d) return
      if (!hasCli(d)) { toast('☁️ El ISP (nube WAN) no es un dispositivo gestionable.'); return }
      ensureConsole(ctx, id)
    }
    setActiveState(id)
    bump()
  }, [lab, ctx, toast, bump])

  const run = useCallback((devId, line) => {
    execCommand(ctx, devId, line)
    bump()
  }, [ctx, bump])

  const giveHint = useCallback(() => {
    const all = []
    for (const f of lab.faults) for (const h of f.hints) all.push(h)
    if (lab.build && lab.build.hints) for (const h of lab.build.hints) all.push(h)
    if (lab.hintsUsed >= all.length) { toast('Ya no hay más pistas para este laboratorio. Revisa la solución o valida de nuevo.', 'err'); return }
    lab.hintsUsed++
    bump()
    toast('💡 Pista ' + lab.hintsUsed + ' revelada (−15 pts al puntaje final).')
  }, [lab, bump, toast])

  const revealSolution = useCallback(() => {
    lab.sawSolution = true
    bump()
    toast('📖 Solución revelada (−40 pts al puntaje final de este laboratorio).')
  }, [lab, bump, toast])

  const resetLab = useCallback(() => {
    if (lab.mode === 'build') {
      const nl = generateConstructionLab(lab.spec.seed, lab.scenario)
      setLab(nl)
      sessionsRef.current = {}
      setActiveState(null)
      setValidation(null)
      setCabling(false)
      bump()
      toast('↺ Construcción reiniciada: topología y VLAN en blanco.')
      return
    }
    const devices = buildDevices(lab.spec)
    lab.faults.forEach((f) => f.apply(devices))
    lab.devices = devices
    lab.solved = false
    lab.attempted = false
    lab.hintsUsed = 0
    lab.sawSolution = false
    sessionsRef.current = {}
    recompute(lab)
    setActiveState(null)
    setValidation(null)
    bump()
    toast('↺ Laboratorio reiniciado a su estado inicial (fallas restauradas).')
  }, [lab, bump, toast])

  const newLab = useCallback(() => {
    if (!lab.solved) setStats((s) => ({ ...s, streak: 0 }))
    const nl = buildLab(randomSeed(), stats.pref || 'any')
    setLab(nl)
    sessionsRef.current = {}
    setActiveState(null)
    setValidation(null)
    setCabling(false)
    bump()
    toast('🎫 ' + nl.spec.ticket.id + ' — ' + nl.scenario.title + ' (' + nl.scenario.diff + ') · Sucursal ' + nl.spec.site)
  }, [lab, stats.pref, bump, toast])

  const validate = useCallback(() => {
    const results = evaluateGoals(lab)
    let countedAttempt = false
    if (!lab.attempted) { lab.attempted = true; countedAttempt = true }
    const passed = results.filter((r) => r.res.ok).length
    const total = results.length
    const scorePct = Math.round((passed / total) * 100)
    const solved = passed === total
    let pts = 0
    if (solved && !lab.solved) {
      lab.solved = true
      pts = Math.max(20, scorePct - 15 * lab.hintsUsed - (lab.sawSolution ? 40 : 0))
      setStats((s) => {
        const history = [{ id: lab.spec.ticket.id, site: lab.spec.site, diff: lab.scenario ? lab.scenario.diff : '', score: pts, date: new Date().toLocaleDateString('es-MX') }, ...s.history].slice(0, 6)
        return { ...s, solved: s.solved + 1, streak: s.streak + 1, best: Math.max(s.best, s.streak + 1), bestScore: Math.max(s.bestScore, pts), history, attempts: s.attempts + (countedAttempt ? 1 : 0) }
      })
    } else if (countedAttempt) {
      setStats((s) => ({ ...s, attempts: s.attempts + 1 }))
    }
    setValidation({ results, passed, total, scorePct, solved, pts, hints: lab.hintsUsed, sol: lab.sawSolution })
    bump()
    if (solved) toast('🎉 ¡Laboratorio resuelto! Racha actual: 🔥' + (stats.streak + 1), 'ok')
    else toast('Validación: ' + passed + '/' + total + ' objetivos cumplidos.', 'err')
  }, [lab, stats.streak, bump, toast])

  const setPref = useCallback((pref) => {
    setStats((s) => ({ ...s, pref }))
    toast('🎚 Dificultad para el próximo lab: ' + pref)
  }, [toast])

  const closeValidation = useCallback(() => setValidation(null), [])

  const toggleCabling = useCallback(() => setCabling((c) => !c), [])
  const connect = useCallback((a, b, type) => {
    const res = connectPorts(lab, a, b, type)
    if (res.ok) { toast('🔌 ' + res.label, 'ok'); bump(); return true }
    toast(res.reason || 'No se pudieron conectar esos puertos.', 'err')
    return false
  }, [lab, toast, bump])

  const value = {
    lab, tick, active, sessions: sessionsRef.current, stats, toasts, validation, goalsResults,
    setActive, run, giveHint, revealSolution, resetLab, newLab, validate, closeValidation, setPref, toast,
    cabling, toggleCabling, connect,
  }
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}
