// Mapa interactivo: SVG con enlaces de estado dinámico, equipos arrastrables y cableado
// estilo Packet Tracer (elige tipo de cable → clic al equipo → ventana de puertos disponibles).
import { useEffect, useRef, useState } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'
import { linkState, deviceHealth, freePorts, cableKindOf, CABLE_LABEL } from '../lib/engine.js'
import { typeLabel } from './icons.jsx'

function Icon({ type }) {
  if (type === 'isp') {
    return (
      <g>
        <path d="M-30,4 a30,22 0 0 1 8,-30 a22,18 0 0 1 30,-6 a20,16 0 0 1 24,14 a16,14 0 0 1 -4,22 z" fill="#12253f" stroke="#38bdf8" strokeWidth="2" />
        <text x="0" y="8" textAnchor="middle" fill="#7dd3fc" fontSize="12" fontWeight="700">WAN</text>
      </g>
    )
  }
  if (type === 'firewall') {
    return (
      <g>
        <rect x="-26" y="-18" width="52" height="36" rx="4" fill="#2a1215" stroke="#f87171" strokeWidth="2" />
        {[-6, 0, 6].map((y) => <line key={y} x1="-26" y1={y} x2="26" y2={y} stroke="#f87171" strokeWidth="1" opacity="0.6" />)}
        <line x1="-8" y1="-18" x2="-8" y2="-6" stroke="#f87171" strokeWidth="1" opacity="0.6" />
        <line x1="10" y1="-6" x2="10" y2="6" stroke="#f87171" strokeWidth="1" opacity="0.6" />
        <line x1="-12" y1="6" x2="-12" y2="18" stroke="#f87171" strokeWidth="1" opacity="0.6" />
      </g>
    )
  }
  if (type === 'router') {
    return (
      <g>
        <circle cx="0" cy="0" r="22" fill="#0e2a1c" stroke="#4ade80" strokeWidth="2" />
        <path d="M-12,0 H12 M6,-5 L12,0 L6,5 M-6,-5 L-12,0 L-6,5 M0,-12 V12 M-5,6 L0,12 L5,6 M-5,-6 L0,-12 L5,-6" stroke="#4ade80" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  if (type === 'l3switch' || type === 'l2switch') {
    const stroke = type === 'l3switch' ? '#a78bfa' : '#38bdf8'
    const fill = type === 'l3switch' ? '#1d1533' : '#0f2233'
    return (
      <g>
        <rect x="-32" y="-15" width="64" height="30" rx="5" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M-20,-4 H14 M8,-9 L14,-4 L8,1 M20,6 H-14 M-8,1 L-14,6 L-8,11" stroke={stroke} strokeWidth="1.7" fill="none" strokeLinecap="round" />
        {type === 'l3switch' && <text x="24" y="-14" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="700">L3</text>}
      </g>
    )
  }
  return (
    <g>
      <rect x="-17" y="-14" width="34" height="22" rx="3" fill="#101c33" stroke="#7dd3fc" strokeWidth="2" />
      <rect x="-13" y="-10" width="26" height="14" rx="1" fill="#1d3a5f" />
      <rect x="-6" y="8" width="12" height="4" fill="#7dd3fc" />
      <rect x="-12" y="12" width="24" height="3" rx="1.5" fill="#7dd3fc" />
    </g>
  )
}

const LED_COLOR = { ok: '#22c55e', warn: '#f59e0b', down: '#ef4444' }
const LINK_CLASS = { ok: 'lk-ok', down: 'lk-down', stp: 'lk-stp', mis: 'lk-mis' }

function LinkTag({ x, y, children }) {
  return (
    <text x={x} y={y} className="portlabel" fontSize="9" textAnchor="middle" fill="#8fb0d4" stroke="#070d1a" strokeWidth="2.6" strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
      {children}
    </text>
  )
}

export default function TopologyCanvas() {
  const { lab, active, setActive, cabling, connect } = useNetwork()
  const [posMap, setPosMap] = useState(() => Object.assign({}, lab.positions))
  const [cableType, setCableType] = useState('auto')
  const [src, setSrc] = useState(null)
  const [popup, setPopup] = useState(null)
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => { setPosMap(Object.assign({}, lab.positions)); setSrc(null); setPopup(null) }, [lab])
  useEffect(() => { if (!cabling) { setSrc(null); setPopup(null) } }, [cabling])

  const order = lab.order || Object.keys(lab.devices)
  const scale = () => { const el = svgRef.current; return el ? el.getBoundingClientRect().width / 960 : 1 }
  const toLocal = (cx, cy) => { const r = svgRef.current.getBoundingClientRect(); const s = r.width / 960; return { x: (cx - r.left) / s, y: (cy - r.top) / s } }

  const openPopup = (devId) => {
    const wrap = wrapRef.current.getBoundingClientRect()
    const r = svgRef.current.getBoundingClientRect()
    const s = r.width / 960
    const p = posMap[devId]
    const left = Math.max(4, Math.min((r.left - wrap.left) + p.x * s + 44, wrap.width - 236))
    const top = Math.max(4, Math.min((r.top - wrap.top) + p.y * s - 8, wrap.height - 40))
    setPopup({ dev: devId, left, top })
  }

  const handleClick = (devId) => {
    if (!cabling) { setActive(devId); return }
    if (lab.devices[devId].type === 'isp') return
    openPopup(devId)
  }

  const onPointerDown = (devId, e) => {
    if (e.button !== 0) return
    const p = posMap[devId]
    dragRef.current = { id: devId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false }
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }
  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true
    const s = scale()
    setPosMap((m) => Object.assign({}, m, { [d.id]: { x: d.ox + (e.clientX - d.sx) / s, y: d.oy + (e.clientY - d.sy) / s } }))
  }
  const onPointerUp = (e) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (d.moved) {
      lab.positions = lab.positions || {}
      lab.positions[d.id] = posMap[d.id]
      return
    }
    handleClick(d.id)
  }

  const pairCompatible = (devA, devB) => {
    const need = cableKindOf(lab.devices[devA], lab.devices[devB])
    if (!need) return false
    if (!cableType || cableType === 'auto') return true
    return cableType === need
  }
  function needLabel(devA, devB) {
    const need = cableKindOf(lab.devices[devA], lab.devices[devB])
    return need ? CABLE_LABEL[need].toLowerCase() : '—'
  }
  const choosePort = (port) => {
    if (!popup) return
    const devId = popup.dev
    if (!src) { setSrc({ dev: devId, port }); setPopup(null); return }
    if (src.dev === devId) { setSrc(null); setPopup(null); return }
    if (connect(src, { dev: devId, port }, cableType)) { setSrc(null); setPopup(null) }
  }

  const portsForPopup = () => (popup ? freePorts(lab, popup.dev) : [])
  const srcDev = src ? lab.devices[src.dev] : null

  return (
    <div ref={wrapRef} className="relative bg-sim-panel border border-sim-border rounded-2xl p-2 shadow-lg">
      {cabling && (
        <div className="mx-2 mt-2 mb-1 rounded-lg border border-violet-700 bg-[#1a1035] px-3 py-2 text-[12px] text-[#e9dcff] flex items-center gap-2 flex-wrap">
          <span className="font-semibold">🔌 Tipo de cable:</span>
          {['auto', 'directo', 'cruzado'].map((t) => (
            <button key={t} onClick={() => setCableType(t)}
              className={'rounded-md border px-2 py-0.5 text-[11px] font-semibold ' + (cableType === t ? 'border-violet-400 bg-violet-700 text-white' : 'border-violet-800 bg-[#241746] text-[#d9c9ff] hover:brightness-125')}>
              {CABLE_LABEL[t]}
            </button>
          ))}
          <span className="text-[11px] text-[#b9a8e6]">
            {src ? <>Origen <b>{srcDev.name} {src.port}</b> — ahora haz clic en el otro equipo y elige su puerto.</> : 'Haz clic en un equipo y elige el puerto en la ventana.'}
          </span>
          {src && <button onClick={() => setSrc(null)} className="ml-auto rounded-md border border-violet-700 bg-[#2a1b4d] px-2 py-0.5 text-[11px] font-semibold">Cancelar</button>}
        </div>
      )}
      <svg ref={svgRef} id="topo" viewBox={lab.viewBox || '0 0 960 540'} className="w-full h-auto block rounded-xl topo-bg" onClick={() => setPopup(null)}>
        {lab.links.map((l) => {
          const pa = posMap[l.a.dev], pb = posMap[l.b.dev]
          if (!pa || !pb) return null
          const state = linkState(lab, l)
          const dA = lab.devices[l.a.dev], dB = lab.devices[l.b.dev]
          const detail = state === 'down' ? 'CAÍDO — revisa shutdown/enlace físico'
            : state === 'stp' ? 'BLOQUEADO por STP'
            : state === 'mis' ? 'VLAN MISMATCH (modos/trunk incompatibles)'
            : 'UP/UP'
          return (
            <g key={l.id}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={'link ' + LINK_CLASS[state]}>
                <title>{dA.name + ' (' + (l.a.port || 'NIC') + ') ↔ ' + dB.name + ' (' + (l.b.port || 'NIC') + ')\n' + l.label + ' — ' + detail}</title>
              </line>
              <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 6} className="portlabel" fontSize="9" textAnchor="middle" fill="#8fb0d4" stroke="#070d1a" strokeWidth="2.6" strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>{l.label}</text>
              {l.a.port && <LinkTag x={pa.x + (pb.x - pa.x) * 0.26} y={pa.y + (pb.y - pa.y) * 0.26 + 11}>{l.a.port}</LinkTag>}
              {l.b.port && <LinkTag x={pa.x + (pb.x - pa.x) * 0.74} y={pa.y + (pb.y - pa.y) * 0.74 + 11}>{l.b.port}</LinkTag>}
            </g>
          )
        })}
        {order.map((id) => {
          const d = lab.devices[id]
          const p = posMap[id]
          if (!p) return null
          const h = deviceHealth(lab, id)
          const sub = d.type === 'pc' ? d.pc.ip : typeLabel(d.type)
          const isSrc = src && src.dev === id
          const plateW = Math.max(d.name.length * 6.8, sub.length * 5.8) + 14
          return (
            <g key={id}
              className={'devg' + (active === id ? ' active' : '') + (cabling ? ' movable' : '')}
              transform={'translate(' + p.x + ',' + p.y + ')'}
              onPointerDown={(e) => onPointerDown(id, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={(e) => e.stopPropagation()}>
              <circle cx="0" cy="0" r="40" fill="none" stroke={isSrc ? '#a78bfa' : '#22d3ee'} strokeWidth={isSrc ? 2.5 : 1.5} className="halo" strokeDasharray="4 4" />
              <g className="iconbg"><Icon type={d.type} /></g>
              <rect x={-plateW / 2} y="27" width={plateW} height="28" rx="7" fill="#070d1a" fillOpacity="0.92" stroke={isSrc ? '#6d5bd0' : '#1d3054'} strokeWidth="0.9" />
              <text x="0" y="38.5" className="devlabel" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="#dce8fa">{d.name}</text>
              <text x="0" y="50" className="devsub" fontSize="9.5" textAnchor="middle" fill="#7f9ec2">{sub}</text>
              <circle cx="26" cy="-22" r="4.5" fill={LED_COLOR[h]} />
              <title>{d.name + ' — ' + d.role + '\n' + (cabling ? 'Clic: elegir puerto · Arrastra para mover' : 'Clic para abrir la consola · Arrastra para mover') + (h === 'down' ? '\n⚠ Estado: FALLA' : h === 'warn' ? '\n⚠ Estado: DEGRADADO' : '\n✔ Estado: OK')}</title>
            </g>
          )
        })}
      </svg>

      {popup && (() => {
        const dev = lab.devices[popup.dev]
        const ports = portsForPopup()
        const compatible = !src || src.dev === popup.dev || pairCompatible(src.dev, popup.dev)
        return (
          <div className="absolute z-30 w-[228px] rounded-xl border border-[#2a4a7a] bg-[#0c1730f7] shadow-2xl text-[12px]" style={{ left: popup.left, top: popup.top }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1d3054]">
              <span className="font-semibold text-sim-text">{dev.name} <span className="text-sim-muted font-normal">· puertos libres</span></span>
              <button onClick={() => { setPopup(null); setSrc(null) }} className="text-sim-muted hover:text-sim-text">✕</button>
            </div>
            {src && src.dev !== popup.dev && (
              <div className="px-3 pt-2 text-[11px] text-[#b9a8e6]">Desde <b>{lab.devices[src.dev].name} {src.port}</b></div>
            )}
            <div className="px-2 py-2 flex flex-col gap-1 max-h-[190px] overflow-y-auto">
              {!compatible ? (
                <div className="px-1 py-2 text-[11px] text-red-300">Este cable no sirve entre {srcDev.name} y {dev.name}. Necesitas cable <b>{needLabel(src.dev, popup.dev)}</b>.</div>
              ) : ports.length ? (
                ports.map((port) => (
                  <button key={port} onClick={() => choosePort(port)}
                    className="text-left px-2.5 py-1.5 rounded-md border border-[#22345c] bg-[#12213d] hover:border-cyan-700 hover:bg-[#163054] font-mono text-[11.5px] text-[#cfe0f7]">
                    {port === 'NIC' ? 'Puerto de red (NIC)' : port}
                  </button>
                ))
              ) : (
                <div className="px-1 py-2 text-[11px] text-sim-muted">Este equipo no tiene puertos libres.</div>
              )}
            </div>
          </div>
        )
      })()}

      <div className="flex flex-wrap gap-4 px-2 pt-2 pb-1 text-sim-muted text-xs">
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#22c55e' }} /> Up/Up (verde)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#ef4444' }} /> Down / shutdown / falla (rojo)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#f59e0b' }} /> STP o VLAN mismatch (naranja)</span>
        <span className="ml-auto">{cabling ? '🔌 Elige cable y haz clic en un equipo' : 'Clic = consola · Arrastra los equipos para acomodarlos'}</span>
      </div>
    </div>
  )
}
