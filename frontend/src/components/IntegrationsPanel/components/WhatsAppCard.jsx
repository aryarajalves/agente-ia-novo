import React from 'react';

const WhatsAppCard = ({ onConfigClick }) => {
    return (
        <div className="form-section" style={{ marginTop: '2.5rem' }}>
            <span className="section-label">Comunicação & Mensageria</span>

            <div style={{
                background: 'rgba(34, 197, 94, 0.03)',
                border: '1px solid rgba(34, 197, 94, 0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: '#25D366',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.8rem',
                        boxShadow: '0 8px 16px rgba(37, 211, 102, 0.2)'
                    }}>
                        💬
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>WhatsApp (Chatwoot)</h4>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Conecte o Chatwoot e gerencie webhooks para automação de mensagens.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onConfigClick}
                    style={{
                        background: 'rgba(37, 211, 102, 0.1)',
                        color: '#25D366',
                        border: '1px solid rgba(37, 211, 102, 0.3)',
                        padding: '0.8rem 1.8rem',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Configurar Webhooks
                </button>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                <p style={{ margin: 0, color: '#86efac', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    💡 <strong>Dica:</strong> Use esta integração para capturar leads do WhatsApp via Chatwoot.
                </p>
            </div>
        </div>
    );
};

export default WhatsAppCard;
