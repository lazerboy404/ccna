// Mapa interactivo de red: SVG con enlaces de color dinámico (verde/rojo/naranja) según el estado en vivo
import { useNetwork } from '../context/NetworkContext.jsx'
import { positionsFor, linkState, deviceHealth } from '../lib/engine.js'
import { TOPO_ORDER } from '../lib/labGenerator.js'
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
  // pc
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

export default function TopologyCanvas() {
  const { lab, active, setActive } = useNetwork()
  const pos = positionsFor(lab.spec)
  const st = (l) => linkState(lab, l)
  return (
    <div className="bg-sim-panel border border-sim-border rounded-2xl p-2 shadow-lg">
      <svg id="topo" viewBox="0 0 960 540" className="w-full h-auto block rounded-xl topo-bg">
        {lab.links.map((l) => {
          const pa = pos[l.a.dev], pb = pos[l.b.dev]
          const state = st(l)
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
              <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 6} className="portlabel" fontSize="9" textAnchor="middle" fill="#54708f">{l.label}</text>
              {l.a.port && <text x={pa.x + (pb.x - pa.x) * 0.26} y={pa.y + (pb.y - pa.y) * 0.26 + 11} className="portlabel" fontSize="9" textAnchor="middle" fill="#54708f">{l.a.port}</text>}
              {l.b.port && <text x={pa.x + (pb.x - pa.x) * 0.74} y={pa.y + (pb.y - pa.y) * 0.74 + 11} className="portlabel" fontSize="9" textAnchor="middle" fill="#54708f">{l.b.port}</text>}
            </g>
          )
        })}
        {TOPO_ORDER.filter((id) => !!lab.devices[id]).map((id) => {
          const d = lab.devices[id]
          const p = pos[id]
          const h = deviceHealth(lab, id)
          const sub = d.type === 'pc' ? d.pc.ip : typeLabel(d.type)
          return (
            <g key={id} className={'devg' + (active === id ? ' active' : '')} transform={'translate(' + p.x + ',' + p.y + ')'} onClick={() => setActive(id)}>
              <circle cx="0" cy="0" r="40" fill="none" stroke="#22d3ee" strokeWidth="1.5" className="halo" strokeDasharray="4 4" />
              <g className="iconbg"><Icon type={d.type} /></g>
              <text x="0" y="38" className="devlabel" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="#cbd9ee">{d.name}</text>
              <text x="0" y="50" className="devsub" fontSize="10" textAnchor="middle" fill="#6c84a8">{sub}</text>
              <circle cx="26" cy="-22" r="4.5" fill={LED_COLOR[h]} />
              <title>{d.name + ' — ' + d.role + (d.type !== 'isp' ? '\nClic para abrir la consola' : '\n(No gestionable)') + (h === 'down' ? '\n⚠ Estado: FALLA' : h === 'warn' ? '\n⚠ Estado: DEGRADADO' : '\n✔ Estado: OK')}</title>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pt-2 pb-1 text-sim-muted text-xs">
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#22c55e' }} /> Up/Up (verde)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#ef4444' }} /> Down / shutdown / falla (rojo)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-[3.5px] rounded" style={{ borderColor: '#f59e0b' }} /> STP o VLAN mismatch (naranja)</span>
        <span className="ml-auto">Clic en un dispositivo → abre su consola CLI</span>
      </div>
    </div>
  )
}
