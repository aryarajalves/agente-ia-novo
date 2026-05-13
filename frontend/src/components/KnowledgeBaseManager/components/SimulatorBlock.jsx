import React, { useState } from 'react';
import { useKB } from '../KBContext';
import { api } from '../../../api/client';

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
                limit: 5
            });
            if (response.ok) {
                const data = await response.json();
                setSimResults(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSimLoading(false);
        }
    };

    return (
        <div style={{ marginTop: '3rem', paddingTop: '0' }}>
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
                        </label>
                    ))}
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
                        {/* Summary of results */}
                        <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                            {simResults.error ? simResults.error : `Encontrados ${simResults.items?.length || 0} itens.`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimulatorBlock;
