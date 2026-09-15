// Panel lateral: ticket con narrativa, objetivos en vivo, pistas, solución paso a paso y estadísticas
import { useState } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'

const DIFF_TEXT = {
  'Básico': 'text-green-300',
  'Intermedio': 'text-amber-300',
  'Avanzado': 'text-red-300',
  'Mixto': 'text-cyan-300',
}

function Panel({ children, className = '' }) {
  return <section className={'bg-sim-panel/95 border border-sim-border rounded-2xl p-3.5 shadow-lg ' + className}>{children}</section>
}

function SectionTitle({ icon, children, aside }) {
  return (
    <h2 className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-[0.16em] font-bold text-sim-muted">
      <span className="text-sim-accent/80 text-[13px]">{icon}</span>
      <span>{children}</span>
      {aside && <span className="ml-auto normal-case tracking-normal font-medium text-[10.5px] text-sim-muted/70">{aside}</span>}
    </h2>
  )
}

export default function TicketPanel() {
  const { lab, goalsResults, stats, toast } = useNetwork()
  const s = lab.spec
  const sc = lab.scenario
  const [copied, setCopied] = useState(false)
  const allHints = []
  for (const f of lab.faults) for (const h of f.hints) allHints.push(h)
  if (lab.build && lab.build.hints) for (const h of lab.build.hints) allHints.push(h)
  const shown = allHints.slice(0, lab.hintsUsed)
  const isBuild = lab.mode === 'build'

  const copySolution = () => {
    const lines = []
    if (isBuild) {
      lines.push(...lab.build.solution)
    } else {
      for (const f of lab.faults) {
        lines.push('! Falla: ' + f.title)
        for (const st of f.solution) {
          const dev = lab.devices[st.devId]
          lines.push('! En ' + (dev ? dev.name : st.devId) + ':')
          lines.push(...st.cmds)
        }
      }
    }
    const text = lines.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); toast('📋 Comandos copiados al portapapeles.', 'ok') }, () => toast('No se pudo copiar.', 'err'))
    } else toast('Portapapeles no disponible en este navegador.', 'err')
  }

  const planRows = () => {
    const rows = [
      ['VLAN 99 · Tránsito', s.nets.transit.net + '/24', s.nets.transit.sw1 + ' (SVI SW1)'],
      ['VLAN ' + s.va + ' · Admin', s.nets.admin.net + '/24', s.nets.admin.gw],
      ['VLAN ' + s.vv + ' · Ventas', s.nets.ventas.net + '/24', s.nets.ventas.gw],
      ['VLAN ' + s.vs + ' · Soporte', s.nets.soporte.net + '/24', s.nets.soporte.gw],
    ]
    if (s.topo.sw3) rows.push(['VLAN ' + s.vc + ' · Contab', s.nets.contab.net + '/24', s.nets.contab.gw])
    rows.push([s.names.pc1 + ' · VLAN ' + s.va, s.pcs.admin + '/24', s.nets.admin.gw])
    rows.push([s.names.pc2 + ' · VLAN ' + s.vv, s.pcs.ventas + '/24', s.nets.ventas.gw])
    rows.push([s.names.pc3 + ' · VLAN ' + s.vs, s.pcs.soporte + '/24', s.nets.soporte.gw])
    if (s.topo.sw3) rows.push([s.names.pc4 + ' · VLAN ' + s.vc, s.pcs.contab + '/24', s.nets.contab.gw])
    if (s.topo.fw) {
      rows.push(['WAN · ISP ↔ FW1', s.wan.ispNet + '/30', 'ISP ' + s.wan.ispIp + ' · FW ' + s.wan.fwWanIp])
      rows.push(['WAN · FW1 ↔ R1', s.wan.r1fwNet + '/30', 'FW ' + s.wan.fwLanIp + ' · R1 ' + s.wan.r1WanIp])
    } else {
      rows.push(['WAN · ISP ↔ R1', s.wan.ispNet + '/30', 'ISP ' + s.wan.ispIp + ' · R1 ' + s.wan.r1WanIp])
    }
    if (isBuild) rows.push(['★ NUEVA VLAN ' + lab.build.vlan + ' · ' + lab.build.vlanName, lab.build.vnet + '/24', lab.build.gw])
    return rows
  }

  const prioClass = s.ticket.prio === 'Crítica' ? 'text-red-300' : s.ticket.prio === 'Media' ? 'text-amber-300' : 'text-sim-muted'

  return (
    <aside className="flex flex-col gap-3 min-w-0">
      <Panel>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-sim-accent font-bold">{isBuild ? '🏗 Proyecto de Construcción' : '🎫 Ticket de Soporte'}</h2>
          <span className="font-mono text-[10px] bg-[#132547]/60 border border-sim-border rounded-md px-1.5 py-0.5 text-sim-muted/70">seed {s.seed}</span>
        </div>

        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <span className="font-mono text-[12.5px] font-bold text-sim-accent">#{s.ticket.id}</span>
          <span className="text-[15px] font-bold text-sim-text leading-tight">{sc.title}</span>
        </div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11.5px] text-sim-muted mb-3">
          <span>📍 {s.site}</span>
          <span className="text-sim-border">·</span>
          <span className={prioClass}>Prioridad {s.ticket.prio}</span>
          <span className="text-sim-border">·</span>
          <span className={DIFF_TEXT[sc.diff] || 'text-sim-muted'}>{sc.diff}</span>
          <span className="text-sim-border">·</span>
          <span>{s.wanDesign === 'static' ? 'WAN rutas estáticas' : 'WAN OSPF área 0'}</span>
        </div>

        <blockquote className="bg-[#0c1c30] border border-[#17314f] rounded-xl px-3.5 py-3 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-sim-accent/70 font-bold mb-1.5">Reporte del cliente</div>
          <p className="text-[12.5px] leading-relaxed text-[#cfe6f7] italic">{sc.story(s)}</p>
        </blockquote>

        {isBuild && (
          <p className="text-[12px] text-sim-muted leading-relaxed mb-3">
            <b className="text-sim-text">{s.ticket.tech}</b> (responsable del sitio). Cablea los equipos con el botón 🔌 y configura la red nueva hasta cumplir todos los objetivos.
          </p>
        )}

        <details className="group border-t border-sim-border/60 mt-3 pt-2.5">
          <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none text-[11.5px] font-semibold text-sim-muted hover:text-sim-text [&::-webkit-details-marker]:hidden">
            <span className="text-sim-accent/70 transition-transform group-open:rotate-90">▸</span>
            Direccionamiento del sitio
            <span className="ml-auto normal-case font-normal text-[10px] text-sim-muted/60">documento del cliente</span>
          </summary>
          <div className="overflow-x-auto mt-2.5">
            <table className="w-full border-collapse text-[11px] font-mono tabular-nums">
              <thead>
                <tr>
                  {['VLAN / Equipo', 'Subred / IP', 'Gateway'].map((h) => (
                    <th key={h} className="text-left text-sim-muted/80 font-semibold px-1.5 py-1 border-b border-sim-border uppercase text-[9.5px] tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planRows().map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className="px-1.5 py-1 border-b border-[#14233f] text-[#bcd0ea] whitespace-nowrap">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Panel>

      <Panel>
        <SectionTitle icon="🎯" aside={goalsResults.filter((g) => g.res.ok).length + '/' + goalsResults.length}>
          {isBuild ? 'Objetivos del proyecto' : 'Objetivos del cliente'}
        </SectionTitle>
        <ul className="flex flex-col">
          {goalsResults.map((g) => (
            <li key={g.id} className="flex items-start gap-2.5 py-1.5 border-b border-sim-border/40 last:border-0 text-[12.5px] leading-snug">
              <span className={'w-4 text-center shrink-0 ' + (g.res.ok ? 'text-green-400' : 'text-[#6b86ad]')}>{g.res.ok ? '✔' : '○'}</span>
              <span className={g.res.ok ? 'text-sim-muted' : 'text-[#c8d8ef]'}>{g.label}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {shown.length > 0 && (
        <Panel>
          <SectionTitle icon="💡" aside={lab.hintsUsed + ' usadas'}>Pistas</SectionTitle>
          <p className="text-[11px] text-sim-muted/80 leading-relaxed mb-2">Cada "Pedir Pista" revela un dato más: primero los síntomas observados y después orientación técnica.</p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((h, i) => (
              <li key={i} className="bg-[#241d0c]/80 border border-[#57421a]/70 rounded-lg px-2.5 py-2 text-[12.5px] leading-relaxed text-[#f1dfae]">
                <span className="text-amber-400/80 font-bold mr-1">{i + 1}.</span>{h}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {lab.sawSolution && (
        <section className="bg-[#1a1035] border border-violet-900 rounded-2xl p-3.5 shadow-lg">
          <SectionTitle icon="📖" aside="−40 pts">Solución paso a paso</SectionTitle>
          <p className="text-[12px] text-[#c3d3ea] leading-relaxed mb-2">
            {isBuild
              ? <>Cablea con el botón 🔌 y ejecuta estos pasos en la consola de cada dispositivo (clic en el diagrama o en su pestaña):</>
              : <>Ejecuta estos comandos en la consola de cada dispositivo (clic en el diagrama o en su pestaña). Corresponden a ESTE laboratorio:</>}
          </p>
          {isBuild
            ? (
              <pre className="font-mono text-[12px] text-[#d9f2e3] leading-relaxed whitespace-pre-wrap bg-[#150d2e] border border-violet-900 rounded-lg px-2.5 py-2">
                {lab.build.solution.join('\n')}
              </pre>
            )
            : lab.faults.map((f) => (
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

      <Panel>
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer select-none list-none text-[11px] uppercase tracking-[0.16em] font-bold text-sim-muted [&::-webkit-details-marker]:hidden">
            <span className="text-sim-accent/70 text-[13px] transition-transform group-open:rotate-90">▸</span>
            <span>📊 Estadísticas e historial</span>
          </summary>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12.5px] text-sim-muted">
            <span><b className="text-sim-text">{stats.solved}</b> resueltos</span>
            <span>racha <b className="text-orange-400">{stats.streak}</b></span>
            <span>mejor racha <b className="text-orange-300">{stats.best}</b></span>
            <span>mejor puntaje <b className="text-sim-text">{stats.bestScore ? stats.bestScore + ' pts' : '—'}</b></span>
          </div>
          <div className="mt-2 text-[11.5px] text-sim-muted/80 font-mono leading-relaxed">
            {stats.history.length
              ? stats.history.map((h, i) => <div key={i}>• {h.id} ({h.site}{h.diff ? ' · ' + h.diff : ''}) — {h.score} pts · {h.date}</div>)
              : 'Aún no resuelves laboratorios. ¡Genera uno y comienza tu racha!'}
          </div>
        </details>
      </Panel>

      <Panel>
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer select-none list-none text-[11px] uppercase tracking-[0.16em] font-bold text-sim-muted [&::-webkit-details-marker]:hidden">
            <span className="text-sim-accent/70 text-[13px] transition-transform group-open:rotate-90">▸</span>
            <span>⌨️ Ayuda rápida de comandos IOS</span>
          </summary>
          <div className="font-mono text-[11.5px] text-[#a9c1e0] leading-[1.8] mt-3">
            <b>enable</b> → modo privilegiado · <b>configure terminal</b> → config<br />
            <b>interface Gi0/1</b> · <b>no shutdown</b> · <b>shutdown</b><br />
            <b>ip address 10.0.0.1 255.255.255.0</b> (routers/SVI)<br />
            <b>vlan 20</b> → <b>name VENTAS</b><br />
            <b>switchport mode access|trunk</b> · <b>switchport access vlan 20</b><br />
            <b>switchport trunk allowed vlan 20,30|all|add 30</b><br />
            <b>switchport trunk native vlan 1</b> · <b>switchport trunk encapsulation dot1q</b><br />
            <b>spanning-tree portfast [trunk]</b> (destraba puerto STP)<br />
            <b>ip route 10.0.20.0 255.255.255.0 10.0.99.2</b> · <b>ip route 0.0.0.0 0.0.0.0 x.x.x.x</b><br />
            <b>router ospf 1</b> → <b>network 10.0.10.0 0.0.0.255 area 0</b><br />
            <b>access-list 110 deny|permit ip &lt;origen&gt; &lt;destino&gt;</b> · <b>ip access-group 110 in|out</b><br />
            <b>access-list 100 permit tcp host A host B eq 80</b> · <b>deny tcp any host B eq 80</b><br />
            <b>switchport port-security [maximum N] [violation restrict|shutdown]</b><br />
            <b>ip nat inside</b> · <b>ip nat outside</b> (R1) · <b>show ip nat translations</b><br />
            <b>ssid CORP vlan 20</b> (Access Point) · <b>show wlan</b> (SSIDs y clientes)<br />
            <b>show ip interface brief</b> · <b>show ip route</b> · <b>show vlan brief</b><br />
            <b>show interfaces trunk</b> · <b>show spanning-tree brief</b> · <b>show ip arp</b><br />
            <b>show interface Gi0/2 switchport</b> · <b>copy running-config startup-config</b><br />
            <b>enable secret X</b> · <b>line console 0|vty 0 4</b> → <b>password X</b> → <b>login</b> · <b>crypto key generate rsa</b> · <b>transport input ssh</b><br />
            <b>ntp server 10.0.0.1</b> · <b>ip dhcp pool X</b> → <b>network ...</b> → <b>default-router ...</b><br />
            <b>show cdp neighbors</b> · <b>show lldp neighbors</b> · <b>show ntp status</b> · <b>show ip dhcp binding</b><br />
            <b>channel-group 1 mode active</b> · <b>spanning-tree bpduguard enable</b> · <b>spanning-tree guard root|loop</b><br />
            <b>ip dhcp snooping [vlan X]</b> · <b>ip arp inspection vlan X</b> · <b>ipv6 address .../64</b> · <b>ipv6 route ...</b><br />
            <b>show etherchannel summary</b> · <b>show ipv6 interface brief</b> · <b>show ip dhcp snooping</b><br />
            <b>show access-lists</b> · <b>show port-security</b> · <b>show ip protocols</b><br />
            <b>show running-config</b> · <b>ping &lt;ip&gt;</b> · <b>hostname X</b><br />
            En equipos: <b>ipconfig</b> · <b>ip &lt;ip&gt; &lt;máscara&gt; &lt;gw&gt;</b> · <b>ping &lt;ip&gt;</b><br />
            🔌 <b>Cablear</b>: clic en un equipo para conectar; clic en un cable para retirarlo/reemplazarlo.
          </div>
        </details>
      </Panel>
    </aside>
  )
}
