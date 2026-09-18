// Consola gráfica para equipos finales: simula la configuración de red de Windows (PC/servidor/laptop)
// o el panel web de administración de una cámara IP, con un Símbolo del sistema funcional.
import { useEffect, useRef, useState } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'
import { validIp, parseMask, netOf, maskLen, isWireless } from '../lib/utils.js'
import { pcUp } from '../lib/engine.js'

function Field({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] text-sim-muted">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck="false" autoComplete="off"
        className="rounded-md border border-sim-border bg-[#0b1728] px-2 py-1.5 font-mono text-[12px] text-[#dbe7f8] outline-none focus:border-cyan-700" />
    </label>
  )
}

export default function EndpointConsole() {
  const { lab, active, run, sessions, toast } = useNetwork()
  const d = active ? lab.devices[active] : null
  const [ip, setIp] = useState('')
  const [mask, setMask] = useState('')
  const [gw, setGw] = useState('')
  const [cmd, setCmd] = useState('')
  const cmdRef = useRef(null)

  useEffect(() => {
    if (d && d.pc) { setIp(d.pc.ip || ''); setMask(d.pc.mask || ''); setGw(d.pc.gw || '') }
  }, [active, d && d.pc && d.pc.ip, d && d.pc && d.pc.mask, d && d.pc && d.pc.gw])
  useEffect(() => { if (cmdRef.current) cmdRef.current.focus() }, [active])

  if (!d || !d.pc) return null
  const isCam = d.type === 'camera'
  const up = pcUp(lab, active)
  const out = (sessions && sessions[active] && sessions[active].out) ? sessions[active].out.slice(-9) : []
  const submit = (e) => { e.preventDefault(); const c = cmd.trim(); if (!c) return; run(active, c); setCmd('') }

  const apply = () => {
    const m = parseMask(mask)
    if (!validIp(ip) || !validIp(m) || !validIp(gw)) { toast('Datos inválidos: revisa IP, máscara y puerta de enlace.', 'err'); return }
    run(active, 'ip ' + ip + ' ' + m + ' ' + gw)
    toast((isCam ? 'Configuración de la cámara' : 'Configuración de red') + ' aplicada.', 'ok')
  }

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-3 overflow-y-auto lg:overflow-hidden term-scroll">
      {/* Terminal / Símbolo del sistema (izquierda) */}
      <div className="rounded-lg border border-sim-border bg-[#05070d] flex flex-col min-h-[200px] min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-sim-border">
          <span className="text-[11.5px] font-semibold text-sim-muted">{isCam ? 'Consola / registro' : 'Símbolo del sistema'}</span>
        </div>
        <div className="flex-1 overflow-y-auto term-scroll p-2.5 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap break-words">
          {out.length ? out.map((e, i) => (
            <div key={i} className={e.cls === 'err' ? 'text-red-400' : e.cls === 'ok' ? 'text-green-400' : e.cls === 'cmd' ? 'text-cyan-300' : e.cls === 'hdr' ? 'text-amber-300' : 'text-[#a9c1e0]'}>{e.t}</div>
          )) : <span className="text-sim-muted">Escribe un comando y pulsa Enter.</span>}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-sim-border px-2.5 py-1.5">
          <span className="text-cyan-300 font-mono text-[12px] whitespace-nowrap">{isCam ? d.name.toLowerCase().replace(/\s+/g, '-') + ':~#' : 'C:\\Users\\' + d.name + '>'}</span>
          <input ref={cmdRef} value={cmd} onChange={(e) => setCmd(e.target.value)} autoComplete="off" spellCheck="false" data-testid="endpoint-cmd"
            placeholder="escribe un comando y presiona Enter…"
            className="flex-1 bg-transparent outline-none text-[#eaf4ff] caret-cyan-400 font-mono text-[12.5px]" />
        </form>
      </div>

      {/* Configuración del adaptador de red (derecha) */}
      <div className={'glass no-blur rounded-lg overflow-hidden flex flex-col min-w-0 ' + (isCam ? 'border-cyan-900' : 'border-sky-900')}>
        <div className={'flex items-center gap-2 px-3 py-1.5 border-b ' + (isCam ? 'border-cyan-900 bg-[#08131f]' : 'border-sky-900 bg-[#0c1a2e]')}>
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
          </span>
          {isCam
            ? <span className="flex-1 truncate rounded bg-[#0b1728] border border-cyan-900 px-2 py-0.5 text-[11px] font-mono text-cyan-200/80">http://{d.pc.ip}/admin</span>
            : <span className="flex-1 text-[12px] font-semibold text-sky-100">🖥️ Adaptador de red</span>}
        </div>

        <div className="p-3 flex-1 min-h-0 overflow-y-auto term-scroll flex flex-col gap-3">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-sim-muted">{isCam ? 'Cámara IP' : isWireless(d) ? 'Laptop (WiFi)' : d.type === 'server' ? 'Servidor' : 'Equipo'} · {d.name}</span>
            <span className={'rounded-full border px-2 py-0.5 font-semibold ' + (up ? 'border-green-800 bg-[#0c2417] text-green-300' : 'border-red-900 bg-[#2a0f12] text-red-300')}>
              {up ? (isCam ? 'EN LÍNEA' : 'Conectado') : (isCam ? 'SIN CONEXIÓN' : 'Medio desconectado')}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <Field label="Dirección IP" value={ip} onChange={setIp} />
            <Field label="Máscara de subred" value={mask} onChange={setMask} />
            <Field label="Puerta de enlace" value={gw} onChange={setGw} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={apply}
              className={'rounded-lg border px-3 py-1.5 text-[12px] font-semibold hover:brightness-125 ' + (isCam ? 'border-cyan-700 bg-gradient-to-br from-cyan-700 to-cyan-800' : 'border-sky-700 bg-gradient-to-br from-sky-700 to-sky-800')}>
              💾 {isCam ? 'Guardar configuración' : 'Aplicar'}
            </button>
            <button onClick={() => { setIp(d.pc.ip || ''); setMask(d.pc.mask || ''); setGw(d.pc.gw || '') }}
              className="rounded-lg border border-sim-border bg-[#12213d] px-3 py-1.5 text-[12px] font-semibold hover:brightness-125">Revertir</button>
          </div>
          <span className="text-[11px] text-sim-muted">Subred actual: <span className="font-mono text-[#bcd0ea]">{d.pc.ip ? netOf(d.pc.ip, d.pc.mask) + '/' + maskLen(d.pc.mask) : '—'}</span></span>
        </div>
      </div>
    </div>
  )
}
