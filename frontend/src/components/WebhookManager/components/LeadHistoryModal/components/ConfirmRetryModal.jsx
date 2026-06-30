import React from 'react';

const ConfirmRetryModal = ({ isOpen, eventId, onCancel, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="premium-modal-content compact" style={{ maxWidth: '380px', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ 
                    width: '50px', height: '50px', borderRadius: '15px', 
                    background: 'rgba(99, 102, 241, 0.1)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', 
                    margin: '0 auto 1.25rem', fontSize: '1.5rem', color: '#818cf8'
                }}>🔄</div>
                <h2 style={{ margin: '0 0 0.75rem 0', fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc' }}>Reiniciar Automação</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    Tem certeza que deseja reiniciar a automação para a mensagem <strong style={{ color: '#fff' }}>#{eventId}</strong>?
                    <br /><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Isso reprocessará a mensagem com o agente de IA.</span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={onCancel}
                        style={{ 
                            padding: '0.7rem 1.5rem', borderRadius: '12px', 
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', 
                            color: '#94a3b8', fontWeight: 700, cursor: 'pointer', 
                            fontSize: '0.85rem', minWidth: '110px' 
                        }}
                    >Cancelar</button>
                    <button
                        onClick={onConfirm}
                        style={{ 
                            padding: '0.7rem 1.5rem', borderRadius: '12px', 
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', 
                            border: 'none', color: '#fff', 
                            fontWeight: 700, cursor: 'pointer', 
                            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.2)', 
                            fontSize: '0.85rem', minWidth: '110px' 
                        }}
                    >Sim, Reiniciar</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRetryModal;
