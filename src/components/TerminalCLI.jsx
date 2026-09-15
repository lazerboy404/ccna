// Consola Cisco IOS por dispositivo: pestañas, historial y salida con prompt dinámico
import { useEffect, useRef, useState } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'
import { termOrder } from '../lib/engine.js'
import { promptOf, cliS } from '../lib/cli.js'

const CLS = {
  cmd: 'text-cyan-300',
  err: 'text-red-400',
  ok: 'text-green-400',
  dim: 'text-slate-500',
  hdr: 'text-amber-300',
  '': 'text-[#d7e3f4]',
}

export default function TerminalCLI() {
  const { lab, active, sessions, setActive, run, tick } = useNetwork()
  const [val, setVal] = useState('')
  const outRef = useRef(null)
  const inRef = useRef(null)
  const sess = active ? sessions[active] : null

  useEffect(() => {
    const el = outRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [tick, active])

  useEffect(() => {
    if (active && inRef.current) inRef.current.focus()
  }, [active])

  const submit = () => {
    if (!active) return
    run(active, val)
    setVal('')
  }
  const onKeyDown = (e) => {
    if (!active || !sess) return
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!sess.hist.length) return
      sess.hi = Math.max(0, (sess.hi === -1 ? sess.hist.length : sess.hi) - 1)
      setVal(sess.hist[sess.hi] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (sess.hi === -1) return
      sess.hi = Math.min(sess.hist.length, sess.hi + 1)
      setVal(sess.hi >= sess.hist.length ? '' : (sess.hist[sess.hi] || ''))
      if (sess.hi >= sess.hist.length) sess.hi = -1
    }
  }

  const prompt = active && lab.devices[active] ? promptOf(lab.devices[active], sess || cliS({ lab, sessions }, active)) : ''

  return (
    <div className="bg-sim-panel border border-sim-border rounded-2xl overflow-hidden shadow-lg">
      <div className="flex gap-1 px-3 pt-2.5 flex-wrap items-center">
        {termOrder(lab).map((id) => (
          <button key={id} onClick={() => setActive(id)}
            className={'px-3 py-1 text-[11.5px] font-mono font-semibold rounded-t-lg border border-b-0 ' +
              (active === id ? 'bg-[#050b14] text-cyan-300 border-cyan-900' : 'bg-[#0f1e3a] text-sim-muted border-sim-border hover:text-sim-text')}>
            {lab.devices[id].name}
          </button>
        ))}
        <div className="ml-auto text-[11px] text-sim-muted pb-1.5">
          {active ? 'Consola: ' + lab.devices[active].name + ' · ↑/↓ historial · cls limpia' : ''}
        </div>
      </div>
      <div className="bg-[#050b14] border-t border-[#12314e] p-3 h-[285px] flex flex-col font-mono text-[13px]">
        {active ? (
          <>
            <div ref={outRef} className="flex-1 overflow-y-auto whitespace-pre-wrap break-words leading-[1.5] pr-1.5 term-scroll">
              {(sess ? sess.out.slice(Math.max(0, sess.out.length - 400)) : []).map((e, i) => (
                <div key={i} className={CLS[e.cls] || CLS['']}>{e.t}</div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-green-400 font-bold whitespace-nowrap">{prompt}</span>
              <input ref={inRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKeyDown}
                autoComplete="off" spellCheck="false"
                className="flex-1 bg-transparent outline-none text-[#eaf4ff] caret-cyan-400 font-mono text-[13px]"
                placeholder="escribe un comando y presiona Enter…" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#6b86ad] text-[13px] text-center leading-relaxed">
            🔌 Haz clic en un dispositivo del diagrama (o en una pestaña)<br />para conectar su cable de consola y abrir la CLI de Cisco IOS.
          </div>
        )}
      </div>
    </div>
  )
}
