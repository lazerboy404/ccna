// Modal con el resultado de "Validar Laboratorio": objetivos, razones de falla y puntaje
import { useNetwork } from '../context/NetworkContext.jsx'
import { useEffect } from 'react'

export default function ValidationModal() {
  const { validation, closeValidation, newLab, stats } = useNetwork()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeValidation() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeValidation])
  if (!validation) return null
  const { results, passed, total, scorePct, solved, pts } = validation
  return (
    <div className="fixed inset-0 bg-[#030711c9] z-50 flex items-center justify-center p-5 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closeValidation() }}>
      <div className="bg-[#0c1730] border border-[#27456f] rounded-2xl max-w-[640px] w-full p-5 shadow-2xl max-h-[88vh] overflow-y-auto">
        <h3 className="text-[17px] font-bold mb-1">{solved ? '🎉 ¡Laboratorio resuelto!' : 'Resultado de la validación'}</h3>
        <div className={'text-[44px] font-extrabold my-1 ' + (solved ? 'text-green-400' : 'text-amber-400')}>{scorePct}%</div>
        <div className="text-[12.5px] text-sim-muted mb-3.5">
          {passed} de {total} objetivos de conectividad cumplidos
          {solved
            ? <> · <b className="text-green-300">Puntaje: {pts} pts</b> (pistas usadas: {validation.hints}, solución vista: {validation.sol ? 'sí' : 'no'}) · Racha: {stats.streak} 🔥</>
            : ' · Revisa los fallos, apóyate en pistas y vuelve a validar.'}
        </div>
        {results.map((r) => (
          <div key={r.id} className={'flex gap-2.5 items-start rounded-lg border px-3 py-2 mb-1.5 text-[12.5px] leading-relaxed ' + (r.res.ok ? 'bg-[#0c2417] border-green-900' : 'bg-[#101d38] border-[#7f1d1d]')}>
            <span className="text-[15px] shrink-0 mt-px">{r.res.ok ? '✅' : '❌'}</span>
            <div>
              <div>{r.label}</div>
              {!r.res.ok && <div className="text-[11.5px] text-red-200/90 mt-0.5 font-mono">↳ {r.res.reason || 'Fallo desconocido'}</div>}
            </div>
          </div>
        ))}
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={closeValidation} className="rounded-lg border border-sim-border bg-[#12213d] px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">Cerrar</button>
          <button onClick={() => { closeValidation(); newLab() }} className="rounded-lg border border-cyan-800 bg-gradient-to-br from-cyan-700 to-cyan-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">🆕 Siguiente Laboratorio</button>
        </div>
      </div>
    </div>
  )
}
