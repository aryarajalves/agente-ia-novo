import React, { useState } from 'react';
import { useKB } from '../KBContext';
import { api } from '../../../api/client';

const OPTION_INFO = {
    translation: 'Detecta o idioma da pergunta e a traduz para português antes de buscar. Útil quando o lead escreve em outro idioma.',
    multiQuery: 'Gera variações da pergunta original (sinônimos e reformulações) para ampliar a cobertura da busca e achar mais itens relevantes.',
    rerank: 'Usa a IA para reordenar os itens encontrados, colocando os mais relevantes para a pergunta no topo da lista.',
    agenticEval: 'A IA revisa os itens retornados e descarta os que não são realmente úteis para responder à pergunta do usuário.',
    parentExpansion: 'Se o item encontrado for um trecho pequeno de um conteúdo maior, expande e retorna o documento completo para dar mais contexto.'
};

const InfoTooltip = ({ text }) => (
    <span className="kb-info-tooltip">
        <span
            className="kb-info-icon"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            ⓘ
        </span>
        <span className="kb-info-tooltip-text">{text}</span>
    </span>
);

const SimulatorBlock = () => {
    const { 
        kbId, simQuery, setSimQuery, 
        simResults, setSimResults, 
        simLoading, setSimLoading 
    } = useKB();

    const [simConfig, setSimConfig] = useState({
        translation: false,
        multiQuery: false,
        rerank: true,
        agenticEval: true,
        parentExpansion: true
    });
    const [simRelevanceThreshold, setSimRelevanceThreshold] = useState(0);

    const handleSimulate = async () => {
        if (!simQuery.trim() || !kbId) return;
        setSimLoading(true);
        setSimResults(null);
        try {
            const response = await api.post(`/knowledge-bases/${kbId}/simulate-rag`, {
                query: simQuery,
                translation_enabled: simConfig.translation,
                multi_query_enabled: simConfig.multiQuery,
                rerank_enabled: simConfig.rerank,
                agentic_eval_enabled: simConfig.agenticEval,
                parent_expansion_enabled: simConfig.parentExpansion,
                relevance_threshold: (simRelevanceThreshold || 0) / 100,
                limit: 5
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setSimResults(data);
            } else {
                setSimResults({ error: data.detail || 'Erro ao consultar a base de conhecimento.' });
            }
        } catch (e) {
            console.error(e);
            setSimResults({ error: 'Erro de conexão ao testar a busca. Verifique sua internet ou tente novamente.' });
        } finally {
            setSimLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ width: '8px', height: '24px', background: 'linear-gradient(to bottom, #22c55e, #10b981)', borderRadius: '4px' }}></div>
                <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Simulador RAG (Central de Testes)</h4>
            </div>
            <div className="kb-item-modern" style={{ cursor: 'default' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Escreva uma pergunta e veja como a base de dados vai responder ao usuário, ativando ou desativando os filtros de IA.
                </p>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {Object.keys(simConfig).map(key => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={simConfig[key]}
                                onChange={e => setSimConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                            />
                            {key.toUpperCase()}
                            <InfoTooltip text={OPTION_INFO[key]} />
                        </label>
                    ))}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        RELEVÂNCIA MÍNIMA PARA ENVIAR AO RAG
                        <InfoTooltip text="Itens encontrados com relevância abaixo desse percentual são descartados e não entram no contexto enviado à IA." />
                        <span style={{ color: '#34d399', fontWeight: 700 }}>{simRelevanceThreshold}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={simRelevanceThreshold}
                        onChange={e => setSimRelevanceThreshold(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        className="kb-search-input-premium"
                        style={{ flex: 1, width: 'auto' }}
                        placeholder="Faça uma pergunta..."
                        value={simQuery}
                        onChange={e => setSimQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSimulate()}
                    />
                    <button onClick={handleSimulate} disabled={simLoading} className="kb-save-btn-modern">
                        {simLoading ? 'Processando...' : '▶ Testar Busca'}
                    </button>
                </div>

                {simResults && (
                    <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h5 style={{ color: '#818cf8', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>RESULTADOS DA BUSCA:</h5>
                            <button onClick={() => setSimResults(null)} className="close-btn">✕</button>
                        </div>
                        {simResults.error ? (
                            <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{simResults.error}</div>
                        ) : (
                            <>
                                <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Encontrados {simResults.items?.length || 0} itens.
                                </div>

                                {(!simResults.items || simResults.items.length === 0) && (
                                    <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                        Nenhum item relevante foi encontrado para essa pergunta.
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {simResults.items?.map((item, idx) => (
                                        <div key={item.id ?? idx} className="kb-result-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.5rem' }}>
                                                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>
                                                    {idx + 1}. {item.question}
                                                </span>
                                                {typeof item.relevance_score === 'number' && (
                                                    <span className="kb-score-badge">
                                                        {Math.round(item.relevance_score * 100)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                                                {item.answer}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                                {item.category && (
                                                    <span className="kb-meta-chip">{item.category}</span>
                                                )}
                                                {item.search_type && (
                                                    <span className="kb-meta-chip">{item.search_type}</span>
                                                )}
                                                {item.metadata_val && (
                                                    <span className="kb-meta-chip">{item.metadata_val}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Itens que a busca vetorial encontrou mas os filtros de IA descartaram —
                                    ajuda a entender POR QUE algo esperado não apareceu nos resultados. */}
                                {simResults.discarded_items && simResults.discarded_items.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <h5 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>
                                            ⚠️ ITENS DESCARTADOS PELOS FILTROS ({simResults.discarded_items.length}):
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {simResults.discarded_items.map((item, idx) => (
                                                <div key={item.id ?? `discarded-${idx}`} className="kb-result-card" style={{ opacity: 0.75, borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.4rem' }}>
                                                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem' }}>
                                                            {item.question}
                                                        </span>
                                                        {typeof item.relevance_score === 'number' && (
                                                            <span className="kb-score-badge">
                                                                {Math.round(item.relevance_score * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ color: '#fbbf24', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                                        Motivo: {item.discard_reason || 'Não especificado.'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimulatorBlock;
