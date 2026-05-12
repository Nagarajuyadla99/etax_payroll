import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("UI ErrorBoundary", { error, errorInfo });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white max-w-xl w-full rounded-xl shadow p-6 border">
          <div className="text-xl font-semibold text-gray-900">
            Something went wrong
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Please refresh the page. If this keeps happening, contact support.
          </div>
          {process.env.NODE_ENV === "development" && this.state.error ? (
            <pre className="mt-4 text-xs bg-gray-50 border rounded p-3 overflow-auto">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          ) : null}
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

