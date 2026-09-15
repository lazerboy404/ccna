// Diálogo de confirmación reutilizable (acciones destructivas o con costo de puntaje).
import { useEffect, useRef } from 'react'
import { useNetwork } from '../context/NetworkContext.jsx'

export default function ConfirmDialog() {
  const { confirmState, closeAsk } = useNetwork()
  const cancelRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeAsk() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeAsk])
  useEffect(() => { if (confirmState && cancelRef.current) cancelRef.current.focus() }, [confirmState])

  if (!confirmState) return null
  const { title, body, confirmLabel, onConfirm } = confirmState
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      className="fixed inset-0 bg-[#030711c9] z-[70] flex items-center justify-center p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) closeAsk() }}>
      <div className="bg-[#0c1730] border border-[#27456f] rounded-2xl max-w-[440px] w-full p-5 shadow-2xl">
        <h3 id="confirm-title" className="text-[16px] font-bold mb-1.5">{title}</h3>
        <p className="text-[12.5px] text-sim-muted leading-relaxed mb-4">{body}</p>
        <div className="flex gap-2 justify-end">
          <button ref={cancelRef} onClick={closeAsk} className="rounded-lg border border-sim-border bg-[#12213d] px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">Cancelar</button>
          <button onClick={() => { closeAsk(); if (onConfirm) onConfirm() }}
            className="rounded-lg border border-cyan-800 bg-gradient-to-br from-cyan-700 to-cyan-800 px-3 py-2 text-[12.5px] font-semibold hover:brightness-125">
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
