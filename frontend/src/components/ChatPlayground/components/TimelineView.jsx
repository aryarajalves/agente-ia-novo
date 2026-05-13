import React from 'react';

const TimelineView = ({ debug }) => {
    if (!debug) return null;
    const steps = [];
    steps.push({ icon: '👤', title: 'Usuário enviou', time: '00:00' });

    if (debug.context_variables && Object.keys(debug.context_variables).length > 0) {
        const vars = debug.context_variables;
        const desc = Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join(' · ');
        steps.push({ icon: '📦', title: 'Variáveis de Contexto recebidas', desc, isContextVars: true, vars });
    }

    if (debug.rag_context) {
        steps.push({ icon: '📚', title: 'RAG Recuperou Contexto', desc: 'Base de Conhecimento consultada' });
    } else if (debug.rag_skipped) {
        steps.push({ icon: '⚡', title: 'RAG Otimizado', desc: debug.rag_skip_reason || 'Pulado por simplicidade' });
    } else if (debug.rag_items && debug.rag_items.length === 0) {
        steps.push({ icon: '🔍', title: 'RAG Consultou', desc: 'Nenhum resultado relevante encontrado' });
    }
    if (debug.internet_searched) steps.push({ icon: '🌐', title: 'Pesquisa Web Realizada', desc: `Busca: "${debug.searched_query}"` });

    if (debug.tool_calls && debug.tool_calls.length > 0) {
        debug.tool_calls.forEach(tc => {
            steps.push({
                icon: '🛠️',
                title: `Ferramenta: ${tc.name}`,
                desc: `Executada com sucesso. Resultado: ${tc.output?.substring(0, 100)}...`
            });
        });
    }

    steps.push({ icon: '🧠', title: 'LLM Processou', desc: `${debug.full_prompt?.length || 0} mensagens totais no prompt` });

    if (debug.guardrails_active) {
        steps.push({
            icon: '🛡️',
            title: 'Políticas Ativas',
            desc: 'Instruções de segurança aplicadas ao prompt.'
        });
    }

    if (debug.violations) {
        steps.push({
            icon: '🚫',
            title: 'Filtro de Output',
            desc: 'Conteúdo bloqueado foi detectado e censurado.',
            isViolation: true
        });
    }

    steps.push({ icon: '🤖', title: 'Resposta Gerada', time: '00:02' });

    return (
        <div className="timeline-container">
            {steps.map((step, i) => (
                <div key={i} className={`timeline-step ${step.isViolation ? 'violation' : ''}`}>
                    <div className="step-icon">{step.icon}</div>
                    <div className="step-content">
                        <div className="step-title" style={{ color: step.isViolation ? '#f43f5e' : step.isContextVars ? '#f59e0b' : '' }}>
                            {step.title}
                        </div>
                        {step.isContextVars && step.vars ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {Object.entries(step.vars).map(([k, v]) => (
                                    <span key={k} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                                        borderRadius: '12px', padding: '2px 8px', fontSize: '0.72rem',
                                        fontFamily: 'monospace', color: '#fbbf24'
                                    }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{k}</span>
                                        <span style={{ opacity: 0.5 }}>=</span>
                                        <span>{String(v)}</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            step.desc && <div className="step-desc" style={{ color: step.isViolation ? '#fda4af' : '' }}>
                                {step.desc}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TimelineView;
