import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config';
import PipelineCountdown from './Common/PipelineCountdown';

const AutomationPipelineModal = ({ 
    event: initialEvent, 
    onClose 
}) => {
    const [event, setEvent] = useState(initialEvent);
    const [maximizedStep, setMaximizedStep] = useState(null);
    const [loading, setLoading] = useState(false);

    // Helper para garantir que a data seja tratada como UTC se não tiver timezone
    const parseDate = (dateStr) => {
        try {
            if (!dateStr) return new Date();
            // Se já for uma data, retorna ela
            if (dateStr instanceof Date) return dateStr;
            
            // Se não tiver 'Z' nem offset (+/-), adiciona 'Z' para o browser tratar como UTC
            const normalized = (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:?\d{2}$/)) 
                ? dateStr 
                : dateStr + 'Z';
            const d = new Date(normalized);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch (e) {
            return new Date();
        }
    };

    // Polling e WebSocket para atualizações em tempo real (Padrão Premium)
    useEffect(() => {
        let isMounted = true;
        
        const pollEvent = async () => {
            if (!event || ['completed', 'error', 'canceled', 'grouped', 'ignored'].includes(event.status)) return;
            
            try {
                const baseUrl = API_URL.replace(/\/$/, '');
                const res = await fetch(`${baseUrl}/webhooks/${event.webhook_config_id}/events/${event.id}`);
                if (!res.ok) return;
                const data = await res.json();
                if (isMounted) {
                    setEvent(prev => ({ ...prev, ...data }));
                }
            } catch (e) {
                console.error('Erro no polling do pipeline:', e);
            }
        };

        // WebSocket para atualizações instantâneas
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    if (data.type === 'status_update' && data.event_id === event.id) {
                        // Atualização imediata via WebSocket
                        pollEvent(); // Força um refresh dos dados completos
                    }
                } catch (e) { console.error('Erro WS Pipeline:', e); }
            };
        } catch (e) { console.error('Erro conexão WS Pipeline:', e); }

        const timer = setInterval(pollEvent, 3000);
        return () => {
            isMounted = false;
            clearInterval(timer);
            if (ws) ws.close();
        };
    }, [event.id, event.status, event.webhook_config_id]);

    // Bloquear scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    // Parsear os passos reais do backend
    let rawSteps = [];
    try {
        rawSteps = JSON.parse(event.processing_steps || '[]');
    } catch (e) {
        console.error('Erro ao parsear steps:', e);
    }

    const steps = rawSteps.map((s, idx) => ({
        id: idx,
        title: s.step || 'Passo da Automação',
        time: s.timestamp ? parseDate(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--',
        content: s.detail || '',
        icon: s.step?.includes('✅') ? '✔️' : 
              s.step?.includes('❌') ? '❌' : 
              s.step?.includes('🤖') ? '🤖' : 
              s.step?.includes('🔍') ? '🔍' : 
              s.step?.includes('📥') ? '📥' : '⚡',
        metadata: s.metadata
    }));

    // Se tiver resposta do agente e não estiver nos steps, adicionar como passo final
    if (event.agent_response && !steps.some(s => s.title.includes('Resposta gerada'))) {
        steps.push({
            id: 'final-resp',
            title: '✅ Resposta Final Enviada',
            time: event.updated_at ? parseDate(event.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            content: event.agent_response,
            icon: '🤖'
        });
    }

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1100 }}>
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '650px', width: '90%', borderRadius: '32px', padding: '2rem', height: '85vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Cabeçalho do Pipeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ 
                            width: '56px', height: '56px', borderRadius: '18px', 
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
                        }}>⚡</div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Pipeline</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                                {parseDate(event.created_at).toLocaleDateString()} · {parseDate(event.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)' }}>✕</button>
                </div>

                {/* Timeline Scrollable Area */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    paddingRight: '1rem',
                    marginRight: '-1rem',
                    paddingBottom: '2rem'
                }} className="custom-scrollbar">
                    <div style={{ position: 'relative', paddingLeft: '3rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Linha da Timeline */}
                        <div style={{ 
                            position: 'absolute', left: '14px', top: '10px', bottom: '10px', width: '2px', 
                            background: 'linear-gradient(to bottom, #6366f1 0%, rgba(99, 102, 241, 0.1) 100%)',
                            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
                        }} />

                        {/* Estado de Espera (Debounce) */}
                        {event.status === 'waiting' && event.scheduled_at && (
                            <div style={{ position: 'relative' }}>
                                <div style={{ 
                                    position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                    borderRadius: '50%', background: '#f59e0b', border: '4px solid #0f172a',
                                    boxShadow: '0 0 12px #f59e0b', zIndex: 1
                                }} />
                                <div style={{ 
                                    background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', 
                                    borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⏳</span>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fde68a' }}>Aguardando Debounce</h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b45309' }}>Aguardando para agrupar mensagens...</p>
                                        </div>
                                    </div>
                                    <div style={{ 
                                        background: 'rgba(245, 158, 11, 0.15)', padding: '8px 16px', borderRadius: '12px',
                                        color: '#f59e0b', fontWeight: 900, fontSize: '1.2rem'
                                    }}>
                                        <PipelineCountdown 
                                            isPending={true}
                                            serverNow={event.server_now}
                                            step={{ 
                                                timestamp: event.created_at, 
                                                step: `${Math.max(1, Math.round((parseDate(event.scheduled_at) - parseDate(event.created_at)) / 1000) || 0)}s` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {steps.map((step) => {
                            const content = step.content || '';
                            const isLarge = content.length > 500;
                            const displayedContent = isLarge ? content.slice(0, 500) + '...' : content;

                            return (
                                <div key={step.id} style={{ position: 'relative' }}>
                                    {/* Ponto da Timeline */}
                                    <div style={{ 
                                        position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                        borderRadius: '50%', background: '#6366f1', border: '4px solid #0f172a',
                                        boxShadow: '0 0 12px #6366f1', zIndex: 1
                                    }} />

                                    {/* Card do Passo */}
                                    <div style={{ 
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '20px', padding: '1.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>{step.title}</h3>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{step.time}</span>
                                        </div>
                                        <div style={{ 
                                            background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '1.25rem',
                                            color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap', position: 'relative', border: '1px solid rgba(255,255,255,0.02)'
                                        }}>
                                            {displayedContent}
                                            {isLarge && (
                                                <div style={{ 
                                                    marginTop: '1.25rem', display: 'flex', justifyContent: 'center',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'
                                                }}>
                                                    <button 
                                                        onClick={() => setMaximizedStep(step)}
                                                        style={{ 
                                                            background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                                                            color: '#818cf8', borderRadius: '10px', padding: '0.6rem 1.25rem',
                                                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <span>🔍</span> Maximizar Informação
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {step.metadata && (
                                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                {step.metadata.model && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                                        🤖 {step.metadata.model}
                                                    </span>
                                                )}
                                                {step.metadata.usage && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                                        💎 {step.metadata.usage.total_tokens} tokens
                                                    </span>
                                                )}
                                                {step.metadata.cost > 0 && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                                        💰 R$ {step.metadata.cost.toFixed(5)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Maximizado (Overlay Secundário) */}
                {maximizedStep && (
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
                                    <span style={{ fontSize: '1.5rem' }}>{maximizedStep.icon}</span>
                                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{maximizedStep.title}</h2>
                                </div>
                                <button 
                                    onClick={() => setMaximizedStep(null)}
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
                                {maximizedStep.content}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationPipelineModal;
