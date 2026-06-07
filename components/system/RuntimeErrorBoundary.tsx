"use client"

import React from "react"

type RuntimeErrorBoundaryState = {
  error: Error | null
}

export class RuntimeErrorBoundary extends React.Component<React.PropsWithChildren, RuntimeErrorBoundaryState> {
  state: RuntimeErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("quantterminal:runtime-error", {
        detail: {
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          at: new Date().toISOString(),
        },
      }))
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black text-red-100 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/40 bg-red-950/30 p-5 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-red-300">QuantTerminal Runtime Guard</div>
            <h1 className="mt-3 text-2xl font-bold text-white">A client panel crashed, but the app was contained.</h1>
            <p className="mt-2 text-sm text-red-100/80">Refresh after checking the browser console. This boundary prevents a single widget crash from taking the whole terminal down.</p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-black/60 p-4 text-xs text-red-100/80">{this.state.error.message}</pre>
            <button
              className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10"
              onClick={() => this.setState({ error: null })}
            >
              Try recover panel
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
