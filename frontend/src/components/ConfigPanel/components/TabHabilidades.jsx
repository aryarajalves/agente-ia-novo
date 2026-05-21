import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../ConfigContext';
import HabilidadesGuideModal from './Modals/HabilidadesGuideModal';

const TabHabilidades = () => {
    const {
        kbList, knowledgeBaseIds, setKnowledgeBaseIds,
        ragRetrievalCount, setRagRetrievalCount,
        ragTranslationEnabled, setRagTranslationEnabled,
        ragMultiQueryEnabled, setRagMultiQueryEnabled,
        ragRerankEnabled, setRagRerankEnabled,
        ragParentExpansionEnabled, setRagParentExpansionEnabled,
        ragAgenticEvalEnabled, setRagAgenticEvalEnabled,
        toolsList, selectedTools, setSelectedTools,
        googleConnected, showHabilidadesGuide, setShowHabilidadesGuide
    } = useConfig();

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button type="button" onClick={() => setShowHabilidadesGuide(true)} className="guide-btn skills">
                    <span>📖</span><span>Guia das Habilidades</span>
                </button>
            </div>

            <HabilidadesGuideModal isOpen={showHabilidadesGuide} onClose={() => setShowHabilidadesGuide(false)} />

            <div className="form-section">
                <span className="section-label">Conhecimento Externo (RAG)</span>
                <div className="form-group">
                    <label>Vincular Bases de Conhecimento</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        <select
                            style={{ flex: 1 }}
                            value=""
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val && !knowledgeBaseIds.includes(val)) {
                                    setKnowledgeBaseIds([...knowledgeBaseIds, val]);
                                }
                            }}
                        >
                            <option value="">+ Adicionar Base...</option>
                            {kbList
                                .filter(kb => !knowledgeBaseIds.includes(kb.id))
                                .map(kb => (
                                    <option key={kb.id} value={kb.id}>{kb.name} ({kb.items?.length || 0} itens)</option>
                                ))}
                        </select>
                        <Link to="/knowledge-bases" className="access-btn">Gerenciar Bases</Link>
                    </div>

                    <div className="selected-chips-container">
                        {knowledgeBaseIds.length === 0 && <p className="empty-msg">Nenhuma base vinculada.</p>}
                        {knowledgeBaseIds.map(kbId => {
                            const kb = kbList.find(b => b.id === kbId);
                            return (
                                <div key={kbId} className="tool-chip kb">
                                    <span>📚 {kb ? kb.name : `ID: ${kbId}`}</span>
                                    <button onClick={() => setKnowledgeBaseIds(knowledgeBaseIds.filter(id => id !== kbId))}>✕</button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Número de Respostas (RAG Limit) <span className="label-value">{ragRetrievalCount} itens</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input type="range" min="1" max="20" step="1" value={ragRetrievalCount} onChange={(e) => setRagRetrievalCount(parseInt(e.target.value))} style={{ flex: 1 }} />
                        <span className="range-val">{ragRetrievalCount}</span>
                    </div>
                </div>

                {/* Advanced RAG Modules */}
                <div className="advanced-rag-box">
                    <label className="box-title">🧠 Módulos Avançados de RAG</label>
                    <div className="rag-modules-list">
                        {[
                            { label: '🌍 Tradução Automática de Busca', state: ragTranslationEnabled, setter: setRagTranslationEnabled, desc: 'Traduz perguntas para o idioma da base antes de procurar.' },
                            { label: '🔀 Busca Multi-Variável (Multi-Query)', state: ragMultiQueryEnabled, setter: setRagMultiQueryEnabled, desc: 'Gera diferentes interpretações da dúvida para maximizar resultados.' },
                            { label: '🎯 Re-Rankeador Semântico (LLM Reranking)', state: ragRerankEnabled, setter: setRagRerankEnabled, desc: 'Usa IA para ordenar os resultados por utilidade real.' },
                            { label: '📖 Expansão de Contexto Pai', state: ragParentExpansionEnabled, setter: setRagParentExpansionEnabled, desc: 'Inclui o contexto completo do documento de origem.' },
                            { label: '🛑 Avaliador Agêntico (Self-Correction)', state: ragAgenticEvalEnabled, setter: setRagAgenticEvalEnabled, desc: 'IA filtra trechos irrelevantes antes de responder.' }
                        ].map((mod, i) => (
                            <div key={i} className="rag-module-item">
                                <div className="mod-info">
                                    <div className="mod-label">{mod.label}</div>
                                    <div className="mod-desc">{mod.desc}</div>
                                </div>
                                <div className={`status-badge ${mod.state ? 'active' : ''}`} onClick={() => mod.setter(!mod.state)}>
                                    {mod.state ? 'ON' : 'OFF'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="form-section">
                <span className="section-label">Ações & Ferramentas (API)</span>
                <div className="form-group">
                    <label>Adicionar Habilidades ao Agente</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        <select
                            style={{ flex: 1 }}
                            value=""
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val && !selectedTools.includes(val)) {
                                    setSelectedTools([...selectedTools, val]);
                                }
                            }}
                        >
                            <option value="">Escolher Ferramenta...</option>
                            {toolsList.filter(t => !t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id)).length > 0 && (
                                <optgroup label="📅 Ferramentas Nativas">
                                    {toolsList
                                        .filter(t => !t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id))
                                        .map(tool => (
                                            <option key={tool.id} value={tool.id}>📅 {tool.name}</option>
                                        ))}
                                </optgroup>
                            )}
                            {toolsList.filter(t => t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id)).length > 0 && (
                                <optgroup label="🔗 Ferramentas Externas (Webhooks)">
                                    {toolsList
                                        .filter(t => t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id))
                                        .map(tool => (
                                            <option key={tool.id} value={tool.id}>🔗 {tool.name}</option>
                                        ))}
                                </optgroup>
                            )}
                        </select>
                        {/* Link de configuração removido por solicitação do usuário */}
                    </div>

                    <div className="selected-chips-container">
                        {selectedTools.filter(toolId => {
                            const tool = toolsList.find(t => t.id === toolId);
                            return tool?.name !== 'transferir_robo';
                        }).length === 0 && <p className="empty-msg">Nenhuma ferramenta vinculada.</p>}
                        {selectedTools
                            .filter(toolId => {
                                const tool = toolsList.find(t => t.id === toolId);
                                return tool?.name !== 'transferir_robo';
                            })
                            .map(toolId => {
                                const tool = toolsList.find(t => t.id === toolId);
                                return (
                                    <div key={toolId} className="tool-chip">
                                        <span>{tool?.webhook_url ? '🔗' : '📅'} {tool ? tool.name : `ID: ${toolId}`}</span>
                                        <button onClick={() => setSelectedTools(selectedTools.filter(id => id !== toolId))}>✕</button>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabHabilidades;
