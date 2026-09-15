// Barrera de error: si el render de un laboratorio falla, muestra una salida de recuperación en vez de una pantalla en blanco.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { console.error('[CCNA Lab Simulator] error de render:', err, info) }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-[540px] text-center bg-sim-panel border border-sim-border rounded-2xl p-6 shadow-lg">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-[16px] font-bold mb-1">Algo falló al dibujar el laboratorio</h2>
            <p className="text-[12.5px] text-sim-muted mb-4 leading-relaxed">
              Ocurrió un error inesperado. Puedes generar un laboratorio nuevo para continuar.
            </p>
            <pre className="text-left text-[11px] text-red-300/80 bg-[#150d1a] border border-red-900/60 rounded-lg px-3 py-2 mb-4 overflow-x-auto whitespace-pre-wrap">{String(this.state.err && this.state.err.message || this.state.err)}</pre>
            <button
              onClick={() => { this.setState({ err: null }); if (this.props.onReset) this.props.onReset() }}
              className="rounded-lg border border-cyan-800 bg-gradient-to-br from-cyan-700 to-cyan-800 px-4 py-2 text-[12.5px] font-semibold hover:brightness-125">
              🆕 Generar laboratorio nuevo
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
