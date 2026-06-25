import React, { type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6">
                    <p className="text-sm font-medium text-destructive">
                        Algo deu errado ao carregar este componente.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Tentar novamente
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
