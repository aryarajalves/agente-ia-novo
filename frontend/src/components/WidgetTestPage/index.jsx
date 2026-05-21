import React, { useEffect, useRef } from 'react';

/**
 * WidgetTestPage — página de simulação do widget.
 * Renderiza uma página que imita um site externo com o widget instalado.
 * Recebe os parâmetros via query string para injetar o script dinamicamente.
 */
const WidgetTestPage = () => {
    const containerRef = useRef(null);
    const params = new URLSearchParams(window.location.search);

    const src = params.get('src') || '';
    const agentId = params.get('agentId') || '';
    const title = params.get('title') || 'Chat de Suporte';
    const primary = params.get('primary') || '#6366f1';
    const header = params.get('header') || '#0f172a';
    const welcome = params.get('welcome') || 'Olá! Como posso ajudar?';

    useEffect(() => {
        if (!src || !agentId) return;

        // Remove qualquer script anterior
        const prev = document.getElementById('widget-test-script');
        if (prev) prev.remove();

        const script = document.createElement('script');
        script.id = 'widget-test-script';
        script.src = src;
        script.setAttribute('data-agent-id', agentId);
        script.setAttribute('data-title', title);
        script.setAttribute('data-primary-color', primary);
        script.setAttribute('data-header-color', header);
        script.setAttribute('data-welcome', welcome);
        script.async = true;

        document.body.appendChild(script);

        return () => {
            const el = document.getElementById('widget-test-script');
            if (el) el.remove();
        };
    }, [src, agentId, title, primary, header, welcome]);

    return (
        <div style={{
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)',
            padding: '3rem 2rem',
            boxSizing: 'border-box',
        }}>
            {/* Simulação de um site fictício */}
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
                <div style={{
                    background: primary,
                    borderRadius: 16,
                    padding: '2rem 2.5rem',
                    marginBottom: '2.5rem',
                    color: 'white',
                    boxShadow: `0 8px 30px ${primary}55`,
                }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
                        🌐 Site de Demonstração
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
                        Esta é uma simulação de como o seu widget aparece em um site real.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    {[
                        { icon: '📦', title: 'Produto A', desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
                        { icon: '🚀', title: 'Produto B', desc: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco.' },
                        { icon: '💎', title: 'Produto C', desc: 'Duis aute irure dolor in reprehenderit in voluptate velit.' },
                        { icon: '⭐', title: 'Produto D', desc: 'Excepteur sint occaecat cupidatat non proident, sunt in.' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: 'white',
                            borderRadius: 12,
                            padding: '1.5rem',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                            border: '1px solid #e2e8f0',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#1e293b' }}>{item.title}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1.5rem 2rem',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                }}>
                    🤖 O widget de atendimento "{title}" está carregado no canto inferior direito desta página.
                    <br />
                    <strong style={{ color: '#64748b' }}>Clique no botão para iniciar uma conversa!</strong>
                </div>
            </div>
        </div>
    );
};

export default WidgetTestPage;
