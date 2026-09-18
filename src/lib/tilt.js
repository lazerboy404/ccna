// Efecto tilt 3D ligero y modular. Aplica a cualquier elemento con [data-tilt="grados"].
// Respeta prefers-reduced-motion y solo usa pointermove/pointerleave (sin bucles de animación).
export function initTilt(root = document) {
  if (typeof window === 'undefined') return () => {}
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const els = Array.from(root.querySelectorAll('[data-tilt]'))
  const cleanups = els.map((el) => {
    const max = Number(el.getAttribute('data-tilt')) || 6
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg')
        el.style.setProperty('--ry', (px * max).toFixed(2) + 'deg')
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  })
  return () => cleanups.forEach((c) => c())
}
