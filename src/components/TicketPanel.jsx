// Panel lateral: ticket con narrativa, objetivos en vivo, pistas, solución paso a paso y estadísticas
import { useState } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'
import { INTERNET, isSwitch } from '../lib/utils.js'
import { TOPO_ORDER } from '../lib/labGenerator.js'

function Badge({ kind, children }) {
  const map = {
    id: 'text-cyan-300 border-cyan-900 bg-[#0c2a3a]',
    scen: 'text-blue-300 border-blue-900 bg-[#0c1d3d]',
    'diff-Básico': 'text-green-300 border-green-800 bg-[#0c2417]',
    'diff-Intermedio': 'text-amber-300 border-amber-800 bg-[#241a05]',
    'diff-Avanzado': 'text-red-300 border-red-900 bg-[#2a0f12]',
    'diff-Mixto': 'text-cyan-300 border-cyan-800 bg-[#08222e]',
    site: 'text-violet-300 border-violet-900 bg-[#1e1640]',
    prio: 'text-red-300 border-red-900 bg-[#2d1215]',
    prioMedia: 'text-amber-300 border-amber-900 bg-[#2b2008]',
    design: 'text-emerald-300 border-emerald-900 bg-[#06251c]',
  }
  return <span className={'rounded-md border px-2 py-0.5 text-[11px] font-semibold ' + (map[kind] || map.id)}>{children}</span>
}

export default function TicketPanel() {
  const { lab, goalsResults, stats, toast } = useNetwork()
  const s = lab.spec
  const sc = lab.scenario
  const [copied, setCopied] = useState(false)
  const allHints = []
  for (const f of lab.faults) for (const h of f.hints) allHints.push(h)
  const shown = allHints.slice(0, lab.hintsUsed)

  const copySolution = () => {
    const lines = []
    for (const f of lab.faults) {
      lines.push('! Falla: ' + f.title)
      for (const st of f.solution) {
        const dev = lab.devices[st.devId]
        lines.push('! En ' + (dev ? dev.name : st.devId) + ':')
        lines.push(...st.cmds)
      }
    }
    const text = lines.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); toast('📋 Comandos copiados al portapapeles.', 'ok') }, () => toast('No se pudo copiar.', 'err'))
    } else toast('Portapapeles no disponible en este navegador.', 'err')
  }

  const planRows = () => {
    const rows = [
      ['VLAN tránsito', 'VLAN 99', s.nets.transit.net + '/24', '—'],
      ['Gateway tránsito', 'SVI SW1', s.nets.transit.sw1 + ' · R1: ' + s.nets.transit.r1, '—'],
      ['VLAN ADMIN', 'VLAN ' + s.va, s.nets.admin.net + '/24', s.nets.admin.gw],
      ['VLAN VENTAS', 'VLAN ' + s.vv, s.nets.ventas.net + '/24', s.nets.ventas.gw],
      ['VLAN SOPORTE', 'VLAN ' + s.vs, s.nets.soporte.net + '/24', s.nets.soporte.gw],
    ]
    if (s.topo.sw3) rows.push(['VLAN CONTAB', 'VLAN ' + s.vc, s.nets.contab.net + '/24', s.nets.contab.gw])
    rows.push([s.names.pc1, 'PC (VLAN ' + s.va + ')', s.pcs.admin + '/24', s.nets.admin.gw])
    rows.push([s.names.pc2, 'PC (VLAN ' + s.vv + ')', s.pcs.ventas + '/24', s.nets.ventas.gw])
    rows.push([s.names.pc3, 'PC (VLAN ' + s.vs + ')', s.pcs.soporte + '/24', s.nets.soporte.gw])
    if (s.topo.sw3) rows.push([s.names.pc4, 'PC (VLAN ' + s.vc + ')', s.pcs.contab + '/24', s.nets.contab.gw])
    if (s.topo.fw) {
      rows.push(['WAN FW1 ↔ R1', '/30', s.wan.r1fwNet + '/30', 'R1: ' + s.wan.r1WanIp + ' · FW: ' + s.wan.fwLanIp])
      rows.push(['WAN ISP ↔ FW1', '/30', s.wan.ispNet + '/30', 'ISP: ' + s.wan.ispIp + ' · FW: ' + s.wan.fwWanIp])
    } else {
      rows.push(['WAN ISP ↔ R1', '/30', s.wan.ispNet + '/30', 'ISP: ' + s.wan.ispIp + ' · R1: ' + s.wan.r1WanIp])
    }
    return rows
  }

  return (
    <aside className="flex flex-col gap-3 min-w-0">
      <section className="bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg">
        <h2 className="text-[11.5px] uppercase tracking-widest text-sim-accent font-bold mb-2.5 flex items-center gap-2">
          🎫 Ticket de Soporte <span className="ml-auto normal-case tracking-normal text-[10px] bg-[#132547] border border-sim-border rounded-md px-2 py-0.5 text-sim-muted">seed {s.seed}</span>
        </h2>
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <Badge kind="id">#{s.ticket.id}</Badge>
          <Badge kind="scen">🎬 {sc.title}</Badge>
          <Badge kind={'diff-' + sc.diff}>Dificultad: {sc.diff}</Badge>
          <Badge kind="site">📍 Sucursal {s.site}</Badge>
          <Badge kind={s.ticket.prio === 'Media' ? 'prioMedia' : 'prio'}>Prioridad: {s.ticket.prio}</Badge>
          <Badge kind="design">{s.wanDesign === 'static' ? '🧭 WAN: rutas estáticas' : '🧭 WAN: OSPF área 0'}</Badge>
        </div>
        <div className="bg-[#0c2233] border-l-[3px] border-sim-accent rounded-lg px-3 py-2 italic text-[#bfe3f5] leading-relaxed text-[12.5px] mb-2.5">
          👤 {sc.story(s)}
        </div>
        <div className="text-[#c3d3ea] leading-relaxed mb-2 text-[13px]">
          <b>Reporta:</b> {s.ticket.tech} (administrador del sitio). Diagnosticar capa por capa (física → VLAN → ruteo) y restaurar TODOS los objetivos usando la CLI de cada dispositivo:
        </div>
        <ul className="flex flex-col gap-1.5 my-2">
          {lab.faults.map((f) => (
            <li key={f.key} className="bg-[#131f3a] border border-[#22345c] border-l-[3px] border-l-red-500 rounded-lg px-2.5 py-1.5 text-[12.5px] leading-snug text-[#d5e2f5]">⚠ {f.symptom}</li>
          ))}
        </ul>
        <details open className="mt-1">
          <summary className="cursor-pointer text-sim-accent text-[12px] font-semibold select-none mb-1.5">Plan de direccionamiento (documentación del cliente)</summary>
          <table className="w-full border-collapse text-[11.5px] font-mono">
            <thead>
              <tr>
                {['Elemento', 'ID/Nombre', 'Red / IP', 'Gateway'].map((h) => (
                  <th key={h} className="text-left text-sim-muted font-semibold px-1.5 py-1 border-b border-sim-border uppercase text-[10px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planRows().map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="px-1.5 py-1 border-b border-[#14233f] text-[#bcd0ea]">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11.5px] text-[#c3d3ea] leading-relaxed mt-2">
            Nota del diseño: las SVI (gateways de VLAN) viven en <b>{s.names.sw1}</b>. R1 aplica NAT hacia Internet ({INTERNET}). {' '}
            {s.topo.fw ? <>El tráfico WAN sale por <b>{s.names.fw}</b> hacia el ISP. </> : 'R1 conecta directo al ISP (sitio sin firewall). '}
            {s.wanDesign === 'static'
              ? <>R1 y SW1 intercambian las rutas LAN/WAN con <b>rutas estáticas</b>.</>
              : <>R1 y SW1 intercambian las rutas LAN con <b>OSPF área 0</b>; la ruta por defecto de SW1 es estática vía R1.</>}
          </p>
        </details>
        <details className="mt-1.5">
          <summary className="cursor-pointer text-sim-accent text-[12px] font-semibold select-none">Topología afectada</summary>
          <ul className="flex flex-col gap-1.5 mt-2">
            {TOPO_ORDER.filter((id) => !!lab.devices[id]).map((id) => {
              const d = lab.devices[id]
              const color = id.startsWith('PC') ? '#0ea5e9' : isSwitch(d) ? '#a78bfa' : '#22d3ee'
              return (
                <li key={id} className="bg-[#131f3a] border border-[#22345c] rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#d5e2f5]" style={{ borderLeft: '3px solid ' + color }}>
                  <b>{d.name}</b> — {d.role}
                </li>
              )
            })}
          </ul>
        </details>
      </section>

      <section className="bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg">
        <h2 className="text-[11.5px] uppercase tracking-widest text-sim-accent font-bold mb-2.5">🎯 Objetivos del Cliente</h2>
        <ul className="flex flex-col gap-1.5">
          {goalsResults.map((g) => (
            <li key={g.id} className={'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] border ' + (g.res.ok ? 'bg-[#0c2417] border-green-900 text-[#c8d8ef]' : 'bg-[#101d38] border-[#1c2f55] text-[#c8d8ef]')}>
              <span className={g.res.ok ? 'text-green-400 w-4 text-center' : 'text-[#47618a] w-4 text-center'}>{g.res.ok ? '✔' : '○'}</span>
              <span>{g.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {shown.length > 0 && (
        <section className="bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg">
          <h2 className="text-[11.5px] uppercase tracking-widest text-sim-accent font-bold mb-2.5">💡 Pistas</h2>
          <ul className="flex flex-col gap-1.5">
            {shown.map((h, i) => (
              <li key={i} className="bg-[#241d0c] border border-[#57421a] rounded-lg px-2.5 py-2 text-[12.5px] leading-relaxed text-[#f1dfae]">💡 {i + 1}. {h}</li>
            ))}
          </ul>
        </section>
      )}

      {lab.sawSolution && (
        <section className="bg-[#1a1035] border border-violet-900 rounded-2xl p-3.5 shadow-lg">
          <h2 className="text-[11.5px] uppercase tracking-widest text-sim-accent font-bold mb-1">📖 Solución Paso a Paso <span className="ml-auto normal-case text-[10px] border border-sim-border rounded-md px-2 py-0.5 text-sim-muted">−40 pts</span></h2>
          <p className="text-[12px] text-[#c3d3ea] leading-relaxed mb-2">
            Ejecuta estos comandos en la consola de cada dispositivo (clic en el diagrama o en su pestaña). Corresponden a ESTE laboratorio:
          </p>
          {lab.faults.map((f) => (
            <div key={f.key} className="mb-2">
              <div className="text-fuchsia-300 font-mono text-[11px] font-bold mb-1">▸ Falla: {f.title} ({f.category})</div>
              {f.solution.map((st, i) => (
                <div key={i} className="bg-[#150d2e] border border-violet-900 rounded-lg px-2.5 py-2 mb-1.5">
                  <pre className="font-mono text-[12px] text-[#d9f2e3] leading-relaxed whitespace-pre-wrap">
                    {'! En ' + (lab.devices[st.devId] ? lab.devices[st.devId].name : st.devId) + (lab.devices[st.devId] && lab.devices[st.devId].type === 'pc' ? ' (consola de PC)' : '') + ':\n' + st.cmds.join('\n')}
                  </pre>
                </div>
              ))}
            </div>
          ))}
          <button onClick={copySolution} className="w-full mt-1 border border-sim-border rounded-lg py-1.5 text-[12px] font-semibold text-sim-text bg-[#12213d] hover:brightness-125">
            {copied ? '✔ Copiado' : '📋 Copiar comandos'}
          </button>
        </section>
      )}

      <section className="bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg">
        <h2 className="text-[11.5px] uppercase tracking-widest text-sim-accent font-bold mb-2.5">📊 Estadísticas</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#101d38] border border-[#1c2f55] rounded-lg p-2 text-center"><div className="text-[19px] font-bold text-orange-400">{stats.streak}</div><div className="text-[10px] text-sim-muted uppercase tracking-wider mt-0.5">🔥 Racha</div></div>
          <div className="bg-[#101d38] border border-[#1c2f55] rounded-lg p-2 text-center"><div className="text-[19px] font-bold text-orange-300">{stats.best}</div><div className="text-[10px] text-sim-muted uppercase tracking-wider mt-0.5">Mejor racha</div></div>
          <div className="bg-[#101d38] border border-[#1c2f55] rounded-lg p-2 text-center"><div className="text-[19px] font-bold text-green-400">{stats.solved}</div><div className="text-[10px] text-sim-muted uppercase tracking-wider mt-0.5">Resueltos</div></div>
          <div className="bg-[#101d38] border border-[#1c2f55] rounded-lg p-2 text-center"><div className="text-[19px] font-bold">{stats.bestScore ? stats.bestScore + ' pts' : '—'}</div><div className="text-[10px] text-sim-muted uppercase tracking-wider mt-0.5">Mejor puntaje</div></div>
        </div>
        <div className="mt-2 text-[11.5px] text-sim-muted font-mono leading-relaxed">
          {stats.history.length
            ? <>{'Últimos laboratorios:'}<br />{stats.history.map((h, i) => <div key={i}>• {h.id} ({h.site}{h.diff ? ' · ' + h.diff : ''}) — {h.score} pts · {h.date}</div>)}</>
            : 'Aún no resuelves laboratorios. ¡Genera uno y comienza tu racha!'}
        </div>
      </section>

      <section className="bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg">
        <details>
          <summary className="cursor-pointer text-sim-accent text-[12px] font-semibold select-none">⌨️ Ayuda rápida de comandos IOS</summary>
          <div className="font-mono text-[11.5px] text-[#a9c1e0] leading-[1.8] mt-2">
            <b>enable</b> → modo privilegiado · <b>configure terminal</b> → config<br />
            <b>interface Gi0/1</b> · <b>no shutdown</b> · <b>shutdown</b><br />
            <b>ip address 10.0.0.1 255.255.255.0</b> (routers/SVI)<br />
            <b>vlan 20</b> → <b>name VENTAS</b><br />
            <b>switchport mode access|trunk</b> · <b>switchport access vlan 20</b><br />
            <b>switchport trunk allowed vlan 20,30|all|add 30</b><br />
            <b>spanning-tree portfast [trunk]</b> (destraba puerto STP)<br />
            <b>ip route 10.0.20.0 255.255.255.0 10.0.99.2</b> · <b>ip route 0.0.0.0 0.0.0.0 x.x.x.x</b><br />
            <b>router ospf 1</b> → <b>network 10.0.10.0 0.0.0.255 area 0</b><br />
            <b>show ip interface brief</b> · <b>show ip route</b> · <b>show vlan brief</b><br />
            <b>show interfaces trunk</b> · <b>show spanning-tree brief</b> · <b>show ip arp</b><br />
            <b>show running-config</b> · <b>show ip protocols</b> · <b>ping &lt;ip&gt;</b> · <b>hostname X</b><br />
            En PCs: <b>ipconfig</b> · <b>ip &lt;ip&gt; &lt;máscara&gt; &lt;gw&gt;</b> · <b>ping &lt;ip&gt;</b>
          </div>
        </details>
      </section>
    </aside>
  )
}
