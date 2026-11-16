import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught ERP Runtime Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('SATIVA_COSMETICS_ERP_DATABASE_V1');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-stone-850 p-6 rounded-xl border border-stone-700 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-xl bg-rose-900/60 border border-rose-500/30 text-rose-300 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-white">Sativa Cosmetics ERP - Recovery</h2>
            <p className="text-xs text-stone-400">
              The application encountered an unexpected runtime error. You can reload the application or reset the local database snapshot.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-stone-950 text-rose-400 text-[11px] rounded font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
