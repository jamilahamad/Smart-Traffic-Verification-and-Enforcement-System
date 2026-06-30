import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import Button from './common/Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }

    console.error('STVES ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const showDetails = Boolean(this.props.showDetails);
    const title = this.props.title || 'Something went wrong';
    const description =
      this.props.description ||
      'STVES encountered an unexpected frontend error. You can retry or reload the application.';

    return (
      <div className="stves-error-boundary min-h-[60vh] flex items-center justify-center p-6">
        <section className="stves-error-boundary-card w-full max-w-2xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={34} />
          </div>

          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
            {description}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              leftIcon={RefreshCw}
              onClick={this.handleReset}
            >
              Try Again
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={this.handleReload}
            >
              Reload App
            </Button>
          </div>

          {showDetails && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                Error Details
              </p>

              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-red-600">
                {this.state.error?.message || String(this.state.error)}
                {'\n\n'}
                {this.state.errorInfo?.componentStack || ''}
              </pre>
            </div>
          )}
        </section>
      </div>
    );
  }
}

export default ErrorBoundary;