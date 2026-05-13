import React from 'react';

export const ProvisionModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: '#0f172a',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '24px',
                padding: '2rem',
                maxWidth: '480px',
                width: '90%'
            }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>🎉 Integração Pronta!</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                    As ferramentas foram atualizadas no seu catálogo. Agora você pode ir em qualquer agente e ativar as ferramentas do Google Agenda.
                </p>
                <button
                    className="access-btn"
                    style={{ width: '100%' }}
                    onClick={onClose}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};

export const ErrorModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1e1b4b, #2d0a0a)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '28px',
                padding: '2.5rem',
                maxWidth: '440px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(220, 38, 38, 0.15)'
            }}>
                <div style={{
                    width: '72px', height: '72px',
                    background: 'rgba(220, 38, 38, 0.15)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2.5rem',
                    border: '1px solid rgba(220, 38, 38, 0.3)'
                }}>
                    {data.icon || '⚠️'}
                </div>
                <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>
                    {data.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                    {data.message}
                </p>
                <button
                    onClick={onClose}
                    style={{
                        background: 'white', color: '#7f1d1d', border: 'none',
                        padding: '0.9rem 2rem', borderRadius: '14px',
                        fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                        width: '100%', transition: 'transform 0.2s',
                    }}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
