import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(_error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        // You could log to an error reporting service here
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
                    <div className="glass-panel rounded-2xl p-8 max-w-lg w-full text-center">
                        <div className="p-4 bg-red-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-text-primary mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-text-secondary mb-6">
                            An unexpected error occurred. This has been logged for investigation.
                        </p>

                        {/* Error details (development only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
                                <p className="text-red-400 text-sm font-mono break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 rounded-xl bg-bg-secondary border border-border-color text-text-primary hover:bg-white/10 transition flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
