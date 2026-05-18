import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';

const ViewTranscriptionModal = () => {
    const { selectedTaskForView, setSelectedTaskForView } = useTranscription();
    const [copied, setCopied] = useState(false);

    if (!selectedTaskForView) return null;

    const handleCopy = async () => {
        const text = selectedTaskForView.result_text || 'Sem transcrição disponível.';
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            
            // Dispara Toast Premium de Sucesso
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Texto copiado para a área de transferência!', type: 'success' }
            }));
            
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Falha ao copiar o texto.', type: 'error' }
            }));
        }
    };

    return (
        <div 
            className="modal-overlay" 
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
            }}
        >
            <div 
                className="modal-content" 
                style={{
                    background: '#0f172a', 
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    padding: '2.5rem', 
                    borderRadius: '24px', 
                    width: '600px', 
                    maxWidth: '90%',
                    textAlign: 'left',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '2rem' }}>📝</span>
                        <div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px', whiteSpace: 'nowrap' }}>
                                Transcrição Concluída
                            </h2>
                            <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px', whiteSpace: 'nowrap' }}>
                                {selectedTaskForView.filename}
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleCopy}
                        style={{
                            background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            border: copied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '10px',
                            color: copied ? '#4ade80' : '#818cf8',
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {copied ? '✅ Copiado!' : '📋 Copiar Texto'}
                    </button>
                </div>

                <div 
                    style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        color: '#e2e8f0',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        overflowY: 'auto',
                        flex: 1,
                        marginBottom: '1.5rem',
                        minHeight: '200px',
                        maxHeight: '400px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {selectedTaskForView.result_text || 'Nenhum texto transcrito foi gerado para este arquivo.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button 
                        onClick={() => setSelectedTaskForView(null)} 
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            borderRadius: '12px',
                            padding: '10px 24px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewTranscriptionModal;
