import React, { useState } from 'react';
import TimelineView from './TimelineView';

const MessageBubble = ({ 
    msg, 
    msgIndex, 
    isRegularUser, 
    feedbackState, 
    handleThumbsUp, 
    handleThumbsDown, 
    readFbFromStorage, 
    selectedAgentId 
}) => {
    const [showDebug, setShowDebug] = useState(false);
    const isUser = msg.role === 'user';
    
    const fbState = feedbackState?.[msgIndex] || (!isUser && msg.content && readFbFromStorage ? readFbFromStorage(selectedAgentId, msg.content) : null);
    const canFeedback = !isUser && msg.metrics && !msg.isError && handleThumbsUp && handleThumbsDown;

    if (msg.isLink) {
        const url = msg.content.trim();
        return (
            <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`}>
                <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-bubble"
                >
                    <span style={{ fontSize: '1rem' }}>🔗</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>↗</span>
                </a>
            </div>
        );
    }

    return (
        <>
            <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'} ${msg.isSplit ? 'is-split' : ''}`}>
                {!isUser && <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>}
                <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                    {msg.image_url && (
                        <div className="message-image-container" style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                            <img
                                src={msg.image_url}
                                alt="Enviada pelo usuário"
                                style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', cursor: 'zoom-in' }}
                                onClick={() => window.open(msg.image_url, '_blank')}
                            />
                        </div>
                    )}
                    <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {msg.created_at && (
                        <div className="message-timestamp" data-testid="msg-timestamp" style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: isUser ? 'right' : 'left', marginTop: '4px' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {msg.metrics && !isRegularUser && (
                        <div className="message-meta">
                            {msg.metrics.input_tokens !== undefined ? (
                                <>
                                    <span className="meta-pill input-tokens-pill" title="Tokens de Entrada (Contexto + Prompt)">
                                        📥 {msg.metrics.input_tokens.toLocaleString()} IN
                                    </span>
                                    <span className="meta-pill output-tokens-pill" title="Tokens de Saída (Resposta da IA)">
                                        📤 {msg.metrics.output_tokens.toLocaleString()} OUT
                                    </span>
                                    <span className="meta-pill tokens-pill total" title="Total de Tokens consumidos">
                                        ⚡ {msg.metrics.tokens.toLocaleString()} TOTAL
                                    </span>
                                    {msg.metrics.cost !== undefined && (
                                        <span className="meta-pill cost-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }} title="Custo estimado desta resposta em BRL">
                                            💰 R$ {msg.metrics.cost.toFixed(4)}
                                        </span>
                                    )}
                                    {msg.metrics.response_time_ms !== undefined && (
                                        <span className="meta-pill time-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }} title="Tempo total de processamento">
                                            ⏱️ {(msg.metrics.response_time_ms / 1000).toFixed(2)}s
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="meta-pill tokens-pill">⚡ {msg.metrics.tokens.toLocaleString()} toks</span>
                                    {msg.metrics.cost !== undefined && (
                                        <span className="meta-pill cost-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                                            💰 R$ {msg.metrics.cost.toFixed(4)}
                                        </span>
                                    )}
                                </>
                            )}

                            {msg.model_used && (
                                <span className="meta-pill model-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ✨ {msg.model_used}
                                </span>
                            )}
                            {msg.metrics?.model_role && (
                                <span className="meta-pill" style={{
                                    background: msg.metrics.model_role === 'main' ? 'rgba(16, 185, 129, 0.15)' :
                                        msg.metrics.model_role === 'fallback' ? 'rgba(234, 179, 8, 0.15)' :
                                            'rgba(239, 68, 68, 0.15)',
                                    color: msg.metrics.model_role === 'main' ? '#10b981' :
                                        msg.metrics.model_role === 'fallback' ? '#eab308' :
                                            '#ef4444',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontWeight: 600
                                }}>
                                    {msg.metrics.model_role === 'main' ? '🟢 Principal' :
                                        msg.metrics.model_role === 'fallback' ? '🟡 Fallback' :
                                            '🔴 Emergência'}
                                </span>
                            )}
                            {msg.tool_calls && msg.tool_calls.length > 0 && (
                                <span className="meta-pill tool-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} title="Ferramentas externas foram utilizadas">
                                    🛠️ Tools
                                </span>
                            )}

                            {msg.debug?.guardrails_active && (
                                <span className="meta-pill guardrail-pill active" title="Políticas de segurança aplicadas">🛡️ Seguro</span>
                            )}
                            {msg.violations && (
                                <span className="meta-pill guardrail-pill danger">🚫 Filtrado</span>
                            )}
                            {!isUser && msg.debug && (
                                <button onClick={() => {
                                    setShowDebug(!showDebug);
                                }} className={`debug-toggle-btn ${showDebug ? 'active' : ''}`}>
                                    {showDebug ? 'Ocultar Detalhes' : '🔍 Raio-X'}
                                </button>
                            )}

                            {/* ---- Botões de Feedback ---- */}
                            {canFeedback && (
                                <div className="feedback-btns">
                                    {!fbState && (
                                        <>
                                            <button
                                                className="feedback-btn thumbs-up"
                                                onClick={() => handleThumbsUp(msg, msgIndex)}
                                                title="Resposta correta — adicionar ao dataset"
                                            >👍</button>
                                            <button
                                                className="feedback-btn thumbs-down"
                                                onClick={() => handleThumbsDown(msg, msgIndex)}
                                                title="Resposta ruim — corrigir para treinar"
                                            >👎</button>
                                        </>
                                    )}
                                    {fbState === 'positive' && (
                                        <span className="feedback-done positive" title="Feedback positivo salvo!">✅ Salvo</span>
                                    )}
                                    {(fbState === 'negative') && (
                                        <span className="feedback-done negative" title="Correção salva no dataset">🎯 Corrigido</span>
                                    )}
                                    {fbState === 'correcting' && (
                                        <span className="feedback-done correcting">✏️ Corrigindo...</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {showDebug && (
                        msg.debug ? (
                            <div className="debug-panel">
                                <h5 style={{ margin: '0 0 10px 0', color: '#fbbf24' }}>🧠 Raio-X do Pensamento</h5>
                                <TimelineView debug={msg.debug} />
                                {msg.debug.rag_items && msg.debug.rag_items.length > 0 ? (
                                    <div className="debug-section">
                                        <strong>📚 Fontes Recuperadas (RAG):</strong>
                                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {msg.debug.rag_items.map((item, i) => (
                                                <div key={i} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    borderLeft: '3px solid #6366f1'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ color: '#818cf8', fontWeight: 'bold' }}>#{i + 1} {item.category}</span>
                                                        {item.metadata?.page && (
                                                            <span style={{
                                                                background: '#6366f1',
                                                                color: 'white',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.7rem'
                                                            }}>Pág. {item.metadata.page}</span>
                                                        )}
                                                        {item.relevance_score !== undefined && (
                                                            <span style={{
                                                                background: 'rgba(16, 185, 129, 0.2)',
                                                                color: '#4ade80',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 'bold'
                                                            }}>🎯 Relevância: {item.relevance_score.toFixed(3)}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ color: '#e2e8f0', marginBottom: '2px' }}><strong>P:</strong> {item.question}</div>
                                                    <div style={{ color: '#94a3b8' }}><strong>R:</strong> {item.answer.substring(0, 150)}...</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : msg.debug.rag_context && (
                                    <div className="debug-section">
                                        <strong>📚 RAG Context (Legado):</strong>
                                        <pre>{msg.debug.rag_context}</pre>
                                    </div>
                                )}
                                {msg.debug.translation && (
                                    <div className="debug-section" style={{ borderLeft: '3px solid #6366f1', paddingLeft: '10px' }}>
                                        <strong style={{ color: '#a5b4fc' }}>🌐 Tradução Automática</strong>
                                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                                            <span>
                                                {msg.debug.translation.used_fallback
                                                    ? <span style={{ color: '#f59e0b' }}>⚠️ Idioma não detectado — usou idioma de fallback: <strong>{msg.debug.translation.target_lang}</strong></span>
                                                    : <span style={{ color: '#4ade80' }}>✅ Idioma detectado: <strong>{msg.debug.translation.detected_lang}</strong> → traduzido para <strong>{msg.debug.translation.target_lang}</strong></span>
                                                }
                                            </span>
                                            <span style={{ color: '#64748b' }}>Modelo de tradução: {msg.debug.translation.model}</span>
                                        </div>
                                    </div>
                                )}
                                {msg.debug.error && (
                                    <div className="debug-section" style={{ color: '#f87171' }}>
                                        <strong>❌ Erro Interno:</strong>
                                        <pre>{msg.debug.error}</pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="debug-panel">
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                                    ⚠️ Dados de Raio-X não disponíveis para esta mensagem.
                                </p>
                            </div>
                        )
                    )}
                </div>
                {isUser && <div className="avatar user-avatar">👤</div>}
            </div>
        </>
    );
};

export default MessageBubble;
