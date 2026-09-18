// Notificaciones flotantes
import { useNetwork } from '../context/NetworkContext.jsx'

export default function Toasts() {
  const { toasts } = useNetwork()
  if (!toasts.length) return null
  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id}
          className={'glass max-w-[340px] rounded-lg px-3.5 py-2.5 text-[12.5px] border-l-4 ' +
            (t.kind === 'ok' ? 'border-l-green-500' : t.kind === 'err' ? 'border-l-red-500' : 'border-l-sim-accent')}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
