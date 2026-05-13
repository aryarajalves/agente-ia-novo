import React from 'react';
import { createPortal } from 'react-dom';

const getTesterPersonas = () => ({
    cético: { name: '🧐 Cético', description: 'Questiona tudo, pede provas e é difícil de convencer.' },
    confuso: { name: '😵 Confuso', description: 'Mal explica o que quer e muda de ideia rápido.' },
    hacker: { name: '🕵️ Hacker', description: 'Tenta injetar instruções e burlar as regras da IA.' },
    curioso: { name: '🤔 Curioso', description: 'Faz perguntas profundas e quer saber detalhes técnicos.' },
    custom: { name: '🎭 Customizada', description: 'Você define exatamente como ele deve agir.' }
});

const PlaygroundGuide = ({ showGuide, setShowGuide }) => {
    if (!showGuide) return null;

    // Usamos Portal para garantir que o modal cubra TODA a tela (incluindo o sidebar lateral do app)
    return createPortal(
        <div
            style={{
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: 999999, // Valor extremamente alto
                background: 'rgba(5, 5, 10, 0.98)', 
                backdropFilter: 'blur(25px)',
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflow: 'hidden'
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '650px', // Reduzi o tamanho para não ficar "muito grande"
                maxHeight: '90vh',
                background: '#0f172a',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '28px',
                padding: '2rem',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                overflowY: 'auto', // Rolagem interna no card
                display: 'flex',
                flexDirection: 'column'
            }}>
                <button
                    onClick={() => setShowGuide(false)}
                    style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', fontSize: '1.1rem', cursor: 'pointer',
                        width: '36px', height: '36px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', zIndex: 10
                    }}
                >✕</button>

                <h2 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.6rem' }}>
                    <span style={{ fontSize: '2rem' }}>📖</span> Guia do Laboratório
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1.2rem', borderRadius: '18px' }}>
                        <h3 style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '1rem' }}>
                            🚀 Laboratório de Testes
                        </h3>
                        <p style={{ color: '#94a3b8', lineHeight: '1.5', margin: 0, fontSize: '0.88rem' }}>
                            Este é seu ambiente controlado. Teste prompts, compare modelos e avalie a IA antes da publicação.
                        </p>
                    </div>

                    <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '1.2rem', borderRadius: '18px' }}>
                        <h3 style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '1rem' }}>
                            🎯 Stress Test (Tester AI)
                        </h3>
                        <p style={{ color: '#94a3b8', lineHeight: '1.5', marginBottom: '12px', fontSize: '0.88rem' }}>
                            Simule clientes reais usando Personas. Veja como o agente reage sob pressão e analise o score final.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {Object.entries(getTesterPersonas()).map(([id, p]) => (
                                <div key={id} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', fontSize: '0.78rem', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <strong style={{ color: 'white', display: 'block' }}>{p.name}</strong>
                                    {p.description}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.2rem', borderRadius: '18px' }}>
                            <h3 style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '0.95rem' }}>
                                🧪 Arena A/B
                            </h3>
                            <p style={{ color: '#94a3b8', lineHeight: '1.5', margin: 0, fontSize: '0.8rem' }}>
                                Compare modelos lado a lado com a mesma pergunta.
                            </p>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1.2rem', borderRadius: '18px' }}>
                            <h3 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, fontSize: '0.95rem' }}>
                                🌍 Contexto
                            </h3>
                            <p style={{ color: '#94a3b8', lineHeight: '1.5', margin: 0, fontSize: '0.8rem' }}>
                                Simule variáveis de sistema manualmente.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button 
                        onClick={() => setShowGuide(false)}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            border: 'none', color: 'white', padding: '1rem 2.5rem',
                            borderRadius: '16px', fontWeight: '800', cursor: 'pointer',
                            fontSize: '1rem', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.5)'
                        }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PlaygroundGuide;
