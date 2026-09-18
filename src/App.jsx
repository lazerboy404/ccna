import { NetworkProvider, useNetwork } from './context/NetworkContext.jsx'
import { useEffect } from 'react'
import Header from './components/Header.jsx'
import TicketPanel from './components/TicketPanel.jsx'
import TopologyCanvas from './components/TopologyCanvas.jsx'
import TerminalCLI from './components/TerminalCLI.jsx'
import ValidationModal from './components/ValidationModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import Toasts from './components/Toasts.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTilt } from './lib/tilt.js'

function Shell() {
  const { newLab, active } = useNetwork()
  useEffect(() => initTilt(document), [active])
  return (
    <ErrorBoundary onReset={newLab}>
      <div className="min-h-screen spatial-root">
        <Header />
        <main className="grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-3.5 px-4 py-3.5 max-w-[1680px] mx-auto items-start">
          <div className="order-1 min-w-0" data-tilt="4"><TicketPanel /></div>
          <div className="order-2 flex flex-col gap-3 min-w-0">
            <TopologyCanvas />
            <TerminalCLI />
          </div>
        </main>
        <ValidationModal />
        <ConfirmDialog />
        <Toasts />
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <NetworkProvider>
      <Shell />
    </NetworkProvider>
  )
}
