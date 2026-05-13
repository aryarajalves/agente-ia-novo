import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#020617',
                    color: 'white',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ops! Algo deu errado.</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '500px' }}>
                        Ocorreu um erro inesperado nesta parte do sistema. Não se preocupe, o erro foi registrado e nossa equipe técnica já pode analisá-lo.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Recarregar Página
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <pre style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'rgba(255,0,0,0.1)',
                            borderRadius: '10px',
                            textAlign: 'left',
                            fontSize: '0.8rem',
                            maxWidth: '90vw',
                            overflow: 'auto'
                        }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
