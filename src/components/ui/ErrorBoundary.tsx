import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          className="flex flex-col items-center justify-center min-h-dvh gap-4 p-6 text-center"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <span className="text-5xl">😵</span>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Something went wrong
          </h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
              window.location.href = '/'
            }}
            className="px-5 h-10 rounded-xl text-sm font-semibold text-white mt-2"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
