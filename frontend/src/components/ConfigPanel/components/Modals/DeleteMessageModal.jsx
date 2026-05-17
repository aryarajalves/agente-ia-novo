import React from 'react';
import ReactDOM from 'react-dom';

const DeleteMessageModal = ({ isOpen, onConfirm, onCancel, messageText }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card" style={{ maxWidth: '400px', margin: 'auto' }}>
                <div className="guide-modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span className="guide-modal-title" style={{ color: '#ef4444' }}>🗑️ Confirmar Exclusão</span>
                </div>
                <div className="guide-modal-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        Você tem certeza que deseja apagar esta mensagem de anúncio?
                    </p>
                    <div style={{ 
                        background: 'rgba(0, 0, 0, 0.2)', 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem', 
                        color: '#e2e8f0',
                        marginBottom: '2rem',
                        fontStyle: 'italic',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        "{messageText}"
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button 
                            type="button" 
                            onClick={onCancel}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            onClick={onConfirm}
                            style={{
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Sim, Apagar
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteMessageModal;
