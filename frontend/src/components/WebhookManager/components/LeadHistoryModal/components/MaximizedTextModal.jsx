import React from 'react';

const MaximizedTextModal = ({ text, onClose }) => {
    if (!text) return null;

    return (
        <div 
            className="premium-modal-overlay" 
            onClick={() => {}} 
            style={{ 
                zIndex: 1200, 
                background: 'rgba(0, 0, 0, 0.85)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0
            }}
        >
            <div 
                className="premium-modal-content" 
                onClick={e => e.stopPropagation()}
                style={{ 
                    maxWidth: '600px', 
                    width: '90%', 
                    padding: '2rem', 
                    borderRadius: '16px', 
                    background: '#0f172a', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    position: 'relative'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🔍 Visualização Completa
                    </h3>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: 'none', 
                            color: '#94a3b8', 
                            borderRadius: '50%', 
                            width: '28px', 
                            height: '28px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >✕</button>
                </div>
                
                <div 
                    style={{ 
                        maxHeight: '400px', 
                        overflowY: 'auto', 
                        color: '#e2e8f0', 
                        fontSize: '0.95rem', 
                        lineHeight: '1.6', 
                        whiteSpace: 'pre-wrap', 
                        background: 'rgba(0,0,0,0.2)', 
                        padding: '1.25rem', 
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.03)'
                    }}
                >
                    {text}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            padding: '0.6rem 1.5rem', 
                            borderRadius: '10px', 
                            background: '#6366f1', 
                            border: 'none', 
                            color: '#fff', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            fontSize: '0.85rem'
                        }}
                    >Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default MaximizedTextModal;
