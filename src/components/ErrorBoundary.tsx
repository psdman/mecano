import React from 'react';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur applicative:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md bg-white rounded-2xl p-6 space-y-3 text-center">
            <h1 className="text-lg font-extrabold text-red-600">Une erreur est survenue</h1>
            <p className="text-xs text-slate-600 font-mono break-all bg-slate-100 rounded-lg p-3">
              {this.state.error.message}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg cursor-pointer"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
