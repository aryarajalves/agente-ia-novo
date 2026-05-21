import React from 'react';
import ReactDOM from 'react-dom';

const LeadScoringCriteriaModal = ({ isOpen, onClose, value, onChange }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card" style={{ 
                width: '85vw', 
                maxWidth: '1200px', 
                height: '80vh', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                borderRadius: '16px',
                overflow: 'hidden'
            }}>
                <div className="guide-modal-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1.25rem 2rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <span className="guide-modal-title" style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '700', 
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🎯 Diretrizes e Critérios do Lead Scoring
                    </span>
                </div>
                
                <div className="guide-modal-body" style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '2rem', 
                    gap: '1rem',
                    overflow: 'hidden'
                }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                        Defina as regras e instruções que a IA usará para analisar e classificar seus leads. Dica: descreva pontuações, perguntas relevantes e como classificar o lead como Quente 🔥, Morno ⚡ ou Frio ❄️.
                    </p>
                    
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Ex: Pontue o lead de 0 a 10. Dê 10 pontos se o orçamento for maior que 5k..."
                        style={{
                            flex: 1,
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            color: '#f8fafc',
                            fontSize: '0.95rem',
                            fontFamily: 'monospace',
                            lineHeight: '1.6',
                            resize: 'none',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                </div>
                
                <div className="guide-modal-footer" style={{ 
                    padding: '1.25rem 2rem', 
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    background: 'rgba(0, 0, 0, 0.1)'
                }}>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Concluído
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LeadScoringCriteriaModal;
