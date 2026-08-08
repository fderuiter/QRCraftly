import { Component, ErrorInfo, ReactNode } from 'react';

/**
 *
 */
interface Props {
  /**
   *
   */
  children?: ReactNode;
  /**
   *
   */
  fallback?: ReactNode;
}

/**
 *
 */
interface State {
  /**
   *
   */
  hasError: boolean;
  /**
   *
   */
  error?: Error;
}

/**
 *
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  /**
   *
   * @param error
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   *
   * @param error
   * @param errorInfo
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  /**
   *
   */
  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center text-slate-700 dark:text-slate-200">
          <h2 role="alert" className="mb-4 text-3xl font-bold text-rose-700 dark:text-rose-400">Application Error</h2>
          <p className="mb-8 text-lg">We're sorry, but something went wrong while rendering this page.</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                try {
                  const url = new URL(window.location.href);
                  if (url.searchParams.has('simulate-crash') || url.searchParams.has('crash')) {
                    url.searchParams.delete('simulate-crash');
                    url.searchParams.delete('crash');
                    window.history.replaceState({}, '', url.toString());
                  }
                } catch (e) {
                  console.error('Failed to parse URL in ErrorBoundary:', e);
                }
                window.location.reload();
              }
            }}
            className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
