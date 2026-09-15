// Barra superior: marca, estadísticas, selector de dificultad y acciones del laboratorio
import { useNetwork } from '../context/NetworkContext.jsx'

export default function Header() {
  const { stats, lab, setPref, newLab, resetLab, giveHint, revealSolution, validate, cabling, toggleCabling } = useNetwork()
  const chip = (label, value, hot) => (
    <span className="bg-[#101f3c] border border-sim-border rounded-full px-2.5 py-1 text-xs text-sim-muted whitespace-nowrap">
      {label}: <b className={hot ? 'text-orange-400' : 'text-sim-text'}>{value}</b>
    </span>
  )
  return (
    <header className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-b border-sim-border bg-[#0b1831f2] sticky top-0 z-40 backdrop-blur">
      <div className="flex items-center gap-2.5 mr-1">
        <svg viewBox="0 0 24 24" className="w-[30px] h-[30px]" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#22d3ee" strokeWidth="1.6" />
          <path d="M7 12h10M12 7v10M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <h1 className="text-[16px] font-bold tracking-wide">CCNA <span className="text-sim-accent">Lab Simulator</span></h1>
      </div>
      <div className="flex gap-2 flex-wrap">
        {chip('🔥 Racha', stats.streak, true)}
        {chip('✅ Resueltos', stats.solved)}
        {chip('🧪 Intentos', stats.attempts)}
        {chip('🏆 Mejor racha', stats.best)}
      </div>
      <div className="flex-1" />
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={stats.pref || 'any'}
          onChange={(e) => setPref(e.target.value)}
          title="Dificultad del próximo laboratorio"
          className="bg-[#12213d] border border-sim-border rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-sim-text cursor-pointer">
          <option value="any">🎲 Sorpresa</option>
          <option value="Básico">🟢 Básico</option>
          <option value="Intermedio">🟠 Intermedio</option>
          <option value="Avanzado">🔴 Avanzado</option>
        </select>
        <button onClick={newLab} className="rounded-lg border border-cyan-800 bg-gradient-to-br from-cyan-700 to-cyan-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">🆕 Nuevo Laboratorio</button>
        <button onClick={toggleCabling}
          title="Conecta/reemplaza cables: haz clic en un equipo y elige el puerto, o clic en un cable para retirarlo"
          className={'rounded-lg border px-3 py-2 text-[12.5px] font-semibold hover:brightness-125 ' + (cabling ? 'border-violet-400 bg-gradient-to-br from-violet-600 to-violet-700' : 'border-violet-800 bg-[#241746]')}>
          🔌 {cabling ? 'Cableando…' : 'Cablear'}
        </button>
        <button onClick={resetLab} className="rounded-lg border border-sim-border bg-[#12213d] px-3 py-2 text-[12.5px] font-semibold hover:brightness-125" title="Restaura las fallas de este laboratorio">↺ Reiniciar</button>
        <button onClick={giveHint} className="rounded-lg border border-amber-900 bg-gradient-to-br from-amber-700 to-amber-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">💡 Pedir Pista</button>
        <button onClick={revealSolution} className="rounded-lg border border-violet-800 bg-gradient-to-br from-violet-700 to-violet-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">📖 Ver Solución</button>
        <button onClick={validate} className="rounded-lg border border-green-800 bg-gradient-to-br from-green-700 to-green-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">✅ Validar Laboratorio</button>
      </div>
    </header>
  )
}
