import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled rendering error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-white border border-[#DDD5C9] shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base text-[#1C1917]">
              {this.props.fallbackTitle || 'Component Rendering Interrupted'}
            </h3>
          </div>

          <p className="text-xs text-[#57534E] leading-relaxed">
            A rendering error occurred in this view. The rest of the application remains functional.
          </p>

          {this.state.error && (
            <pre className="p-3 bg-[#FAF9F6] border border-[#EAE4DA] rounded-lg text-xs font-mono text-[#78716C] overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-[#1C1917] hover:bg-[#382E22] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
            <span>Recover View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
