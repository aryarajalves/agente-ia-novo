import React, { useState } from 'react';

export const PreRouterViewerModal = ({ data, onClose }) => {
    const [activeTab, setActiveTab] = useState('organized');
    if (!data) return null;

    // Parsear o conteúdo estruturado do Pre-Router
    let parsedJson = {};
    let promptStr = '';
    let rawJsonStr = '';
    let isValid = false;

    try {
        if (data.includes('```json')) {
            const parts = data.split('```json');
            if (parts.length > 1) {
                const subparts = parts[1].split('```');
                rawJsonStr = subparts[0].trim();
                parsedJson = JSON.parse(rawJsonStr);
                isValid = true;
            }
        }
        
        if (data.includes('```text')) {
            const parts = data.split('```text');
            if (parts.length > 1) {
                const subparts = parts[1].split('```');
                promptStr = subparts[0].trim();
            }
        } else if (data.includes('**Prompt Completo Analisado:**')) {
            const parts = data.split('**Prompt Completo Analisado:**');
            if (parts.length > 1) {
                promptStr = parts[1].trim();
            }
        }
    } catch (e) {
        console.error('Erro ao parsear dados do Pre-Router:', e);
        parsedJson = { error: "Erro ao estruturar os dados.", raw: data };
    }

    if (!isValid) {
        // Fallback caso a formatação em markdown não seja detectada
        return (
            <div 
                className="premium-modal-overlay" 
                style={{ zIndex: 1200, background: 'rgba(0,0,0,0.85)' }}
            >
                <div 
                    className="premium-modal-content"
                    style={{ maxWidth: '900px', width: '95%', height: '80vh', borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>Decisão da IA (Pre-Router)</h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="modal-close-btn"
                            style={{ width: '36px', height: '36px' }}
                        >✕</button>
                    </div>
                    <div 
                        style={{ 
                            flex: 1, background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', padding: '2rem',
                            color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.6', fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap', overflowY: 'auto'
                        }} 
                        className="custom-scrollbar"
                    >
                        {data}
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'organized', label: '🧠 Decisão Organizada', icon: '🎯' },
        { id: 'prompt', label: '📜 Prompt do Pre-Router', icon: '📝' },
        { id: 'raw', label: 'JSON Bruto', icon: '💻' },
    ];

    return (
        <div 
            className="fade-in"
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem', transition: 'all 0.3s'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '24px',
                    width: '100%', maxWidth: '850px',
                    height: '85vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 40px rgba(99, 102, 241, 0.1)',
                    overflow: 'hidden', position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }}>🧠</div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Decisão da IA (Pre-Router)</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Análise de primeiro contato antes do envio aos agentes</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                                background: activeTab === t.id ? '#6366f1' : 'transparent',
                                border: 'none', color: activeTab === t.id ? '#fff' : '#64748b',
                                cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', color: '#cbd5e1' }} className="custom-scrollbar">
                    {activeTab === 'organized' && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Grid de Informações Rápidas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>Tipo de Mensagem</div>
                                    {parsedJson.eh_saudacao ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            👋 Apenas Saudação / Cumprimento
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            💬 Dúvida / Requisição Técnica
                                        </span>
                                    )}
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>Vaga ou Confusa?</div>
                                    {parsedJson.precisa_esclarecimento ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            ⚠️ Sim, precisa de esclarecimento
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            ✅ Não, intenção identificada
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes do Roteamento */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 800 }}>Roteamento e Ações</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Agente Alvo Destinado</span>
                                        <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                                            🎯 Agente ID: <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>{parsedJson.id_agente_alvo || 'Nenhum'}</span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Data Limite Extraída</span>
                                        <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                                            📅 {parsedJson.data_extraida ? <span style={{ color: '#f59e0b' }}>{parsedJson.data_extraida}</span> : 'Nenhuma data extraída'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Extraído */}
                            <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: '16px', padding: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#818cf8', fontWeight: 800, textTransform: 'uppercase' }}>💬 Pergunta/Requisição Extraída</h4>
                                <div style={{ fontSize: '1rem', color: '#fff', lineHeight: '1.6', fontStyle: parsedJson.perguntas_extraidas ? 'normal' : 'italic' }}>
                                    {parsedJson.perguntas_extraidas ? `"${parsedJson.perguntas_extraidas}"` : 'Nenhuma pergunta extraída (mensagem tratada como vazia ou apenas saudação).'}
                                </div>
                            </div>

                            {/* Respostas Diretas e Esclarecimentos */}
                            {(parsedJson.resposta_direta || parsedJson.resposta_esclarecimento) && (
                                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '16px', padding: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase' }}>✍️ Resposta Imediata Resolvida</h4>
                                    <div style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600, lineHeight: '1.6' }}>
                                        {parsedJson.resposta_direta || parsedJson.resposta_esclarecimento}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>
                                        * Esta resposta foi resolvida de forma síncrona pelo Pre-Router e disparada imediatamente ao contato.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'prompt' && (
                        <div className="fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>Prompt do Pre-Router</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(promptStr || "")} 
                                    style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}
                                >Copiar Prompt</button>
                            </div>
                            <div style={{ 
                                background: '#020617', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                overflow: 'hidden',
                                display: 'flex',
                                fontSize: '0.82rem',
                                fontFamily: 'monospace',
                                lineHeight: 1.6
                            }}>
                                <div style={{ 
                                    padding: '1.5rem 0.75rem', 
                                    background: 'rgba(255,255,255,0.02)', 
                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                    color: '#475569',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    minWidth: '45px'
                                }}>
                                    {(promptStr || "").split('\n').map((_, i) => (
                                        <div key={i}>{i + 1}</div>
                                    ))}
                                </div>
                                <pre style={{ 
                                    margin: 0,
                                    padding: '1.5rem', 
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-word',
                                    color: '#cbd5e1',
                                    flex: 1
                                }}>
                                    {promptStr || "Nenhum prompt disponível."}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'raw' && (
                        <div className="fade-in">
                            <pre style={{ 
                                margin: 0, padding: '1.5rem', background: '#020617', borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#4ade80',
                                fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre'
                            }}>
                                {JSON.stringify(parsedJson, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreRouterViewerModal;
