import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-slate-700 dark:text-slate-200">
          <h2 role="alert" className="text-3xl font-bold mb-4 text-rose-700">Application Error</h2>
          <p className="mb-8 text-lg">We're sorry, but something went wrong while rendering this page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
