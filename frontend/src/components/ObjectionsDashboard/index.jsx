import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import './styles/objections.css';

const ObjectionsDashboard = () => {
    const [agents, setAgents] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [clusters, setClusters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [expandedClusterId, setExpandedClusterId] = useState(null);
    const [toast, setToast] = useState(null);
    
    // Modal RAG States
    const [isRagModalOpen, setIsRagModalOpen] = useState(false);
    const [ragForm, setRagForm] = useState({
        kbId: '',
        question: '',
        answer: ''
    });
    const [savingRag, setSavingRag] = useState(false);

    // Sistema de feedback por toast
    const showToast = (message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    };

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Carregar lista de agentes e bases de conhecimento ao montar a tela
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                // 1. Carregar Agentes
                const agentsRes = await api.get('/agents');
                console.log('[ObjectionsDashboard] GET /agents status:', agentsRes.status);
                if (agentsRes.ok) {
                    const agentsData = await agentsRes.json();
                    console.log('[ObjectionsDashboard] Agentes carregados:', agentsData.length);
                    setAgents(agentsData);
                    if (agentsData.length > 0) {
                        setSelectedAgentId(agentsData[0].id.toString());
                    } else {
                        showToast("Nenhum agente encontrado. Crie um agente primeiro.", "error");
                    }
                } else {
                    const errText = await agentsRes.text();
                    console.error('[ObjectionsDashboard] Erro ao carregar agentes:', agentsRes.status, errText);
                    showToast(`Erro ${agentsRes.status} ao carregar agentes. Verifique sua sessão.`, "error");
                }

                // 2. Carregar Bases de Conhecimento
                const kbRes = await api.get('/knowledge-bases');
                if (kbRes.ok) {
                    const kbData = await kbRes.json();
                    setKnowledgeBases(kbData);
                }
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                showToast("Erro de conexão ao carregar dados.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // Carregar ranking de objeções toda vez que mudar o agente selecionado
    useEffect(() => {
        if (!selectedAgentId) return;

        const loadObjections = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/analytics/objections?agent_id=${selectedAgentId}`);
                if (res.ok) {
                    const data = await res.json();
                    setClusters(data.clusters || []);
                } else {
                    showToast("Erro ao carregar ranking de dúvidas.", "error");
                }
            } catch (error) {
                console.error("Erro ao buscar objeções:", error);
                showToast("Erro de rede ao buscar ranking.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadObjections();
        setExpandedClusterId(null);
    }, [selectedAgentId]);

    // Trata do recálculo de dúvidas/objeções
    const handleRecalculate = async () => {
        if (!selectedAgentId || recalculating) return;

        try {
            setRecalculating(true);
            showToast("Recalculando ranking de dúvidas via IA... Aguarde.", "info");

            const res = await api.post(`/analytics/objections/recalculate?agent_id=${selectedAgentId}`);
            if (res.ok) {
                const data = await res.json();
                setClusters(data.clusters || []);
                
                if (data.message && data.message.includes("recentemente")) {
                    showToast(data.message, "info");
                } else {
                    showToast("Ranking de dúvidas recalculado e atualizado! ✨", "success");
                }
            } else {
                const errData = await res.json();
                showToast(errData.detail || "Erro ao recalcular ranking.", "error");
            }
        } catch (error) {
            console.error("Erro ao recalcular dúvidas:", error);
            showToast("Erro de conexão com o servidor.", "error");
        } finally {
            setRecalculating(false);
        }
    };

    // Abre o modal para treinar a base de conhecimento
    const openRagModal = (cluster) => {
        // Encontrar a base de conhecimento preferida associada a este agente
        const currentAgent = agents.find(a => a.id.toString() === selectedAgentId);
        let defaultKbId = '';
        
        if (currentAgent) {
            if (currentAgent.knowledge_base_id) {
                defaultKbId = currentAgent.knowledge_base_id.toString();
            } else if (currentAgent.knowledge_base_ids && currentAgent.knowledge_base_ids.length > 0) {
                defaultKbId = currentAgent.knowledge_base_ids[0].toString();
            }
        }

        // Se o agente não tiver base vinculada, tenta usar a primeira base de conhecimento geral disponível
        if (!defaultKbId && knowledgeBases.length > 0) {
            defaultKbId = knowledgeBases[0].id.toString();
        }

        setRagForm({
            kbId: defaultKbId,
            question: cluster.representative_question || '',
            answer: cluster.suggested_script || ''
        });
        setIsRagModalOpen(true);
    };

    // Submete a pergunta/resposta à base de RAG selecionada
    const handleSaveToRag = async (e) => {
        e.preventDefault();
        if (!ragForm.kbId) {
            showToast("Selecione uma Base de Conhecimento.", "error");
            return;
        }

        try {
            setSavingRag(true);
            const res = await api.post(`/knowledge-bases/${ragForm.kbId}/items`, {
                question: ragForm.question,
                answer: ragForm.answer,
                category: "Objeções do Robô"
            });

            if (res.ok) {
                showToast("Dúvida adicionada com sucesso à Base de Conhecimento! 📚", "success");
                setIsRagModalOpen(false);
            } else {
                const errData = await res.json();
                showToast(errData.detail || "Erro ao salvar na base de conhecimento.", "error");
            }
        } catch (error) {
            console.error("Erro ao salvar RAG:", error);
            showToast("Erro de rede ao salvar na base de conhecimento.", "error");
        } finally {
            setSavingRag(false);
        }
    };

    // Toggle expandir accordion
    const toggleExpandCluster = (id) => {
        setExpandedClusterId(expandedClusterId === id ? null : id);
    };

    // Calcula a porcentagem do progresso visual
    const getMaxCount = () => {
        if (clusters.length === 0) return 1;
        return Math.max(...clusters.map(c => c.count));
    };

    const maxCount = getMaxCount();

    return (
        <div className="objections-container">
            <header className="objections-header">
                <h1 className="objections-title">
                    <span>🏆</span> Ranking de Dúvidas & Objeções
                </h1>
                <p className="objections-subtitle">
                    Descubra quais são as dúvidas e objeções mais frequentes que os leads trazem e treine o robô para respondê-las com scripts persuasivos.
                </p>
            </header>

            {/* Painel Superior */}
            <div className="objections-control-panel">
                <div className="agent-selector-wrapper">
                    <span className="agent-selector-label">Agente Analisado:</span>
                    <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="agent-select"
                        disabled={loading || recalculating}
                    >
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                🤖 {agent.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="objections-recalc-btn"
                    onClick={handleRecalculate}
                    disabled={loading || recalculating || !selectedAgentId}
                >
                    {recalculating ? (
                        <>
                            <div className="recalc-spinner"></div>
                            <span>Recalculando...</span>
                        </>
                    ) : (
                        <>
                            <span>🔄</span>
                            <span>Recalcular/Atualizar Ranking</span>
                        </>
                    )}
                </button>
            </div>

            {/* Lista Principal do Ranking */}
            {loading && !recalculating ? (
                <div className="spinner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4rem 0' }}>
                    <div className="loading-spinner"></div>
                    <span className="loading-text" style={{ color: '#94a3b8', marginTop: '1rem' }}>Analisando interações e gerando ranking...</span>
                </div>
            ) : clusters.length === 0 ? (
                <div className="objections-empty">
                    <div className="empty-state-icon">🔮</div>
                    <h3 className="empty-state-title">Nenhuma dúvida recorrente identificada</h3>
                    <p className="empty-state-desc">
                        O agente ainda não possui interações suficientes registradas para formar grupos semânticos de dúvidas repetidas nos últimos 30 dias.
                    </p>
                    <button 
                        className="objections-recalc-btn" 
                        style={{ margin: '0 auto' }} 
                        onClick={handleRecalculate}
                        disabled={recalculating || !selectedAgentId}
                    >
                        Tentar Recalcular Agora
                    </button>
                </div>
            ) : (
                <div className="objections-list">
                    {clusters.map((cluster, index) => {
                        const isExpanded = expandedClusterId === cluster.id;
                        const percentage = Math.round((cluster.count / maxCount) * 100);

                        return (
                            <div key={cluster.id} className="objection-card">
                                <div className="objection-card-header" onClick={() => toggleExpandCluster(cluster.id)}>
                                    {/* Badge da posição no Ranking */}
                                    <div className="objection-rank-badge">
                                        <span className="objection-rank-num">{index + 1}º</span>
                                        <span className="objection-rank-freq">{cluster.count}x</span>
                                    </div>

                                    {/* Informações da categoria */}
                                    <div className="objection-info-wrapper">
                                        <h3 className="objection-category-name">{cluster.category_name}</h3>
                                        <p className="objection-representative">
                                            ex: "{cluster.representative_question}"
                                        </p>
                                    </div>

                                    {/* Barra de Progresso */}
                                    <div className="objection-progress-container">
                                        <span className="objection-progress-lbl">Densidade: {percentage}%</span>
                                        <div className="objection-progress-bar-bg">
                                            <div 
                                                className="objection-progress-bar-fill"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Ação de Expandir */}
                                    <button className={`btn-objection-expand ${isExpanded ? 'expanded' : ''}`}>
                                        ▼
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="objection-card-content">
                                        {/* Exemplos de Perguntas Reais */}
                                        <div className="objection-details-section">
                                            <h4 className="objection-section-title">💬 Perguntas Reais dos Leads</h4>
                                            <div className="examples-grid">
                                                {cluster.examples && cluster.examples.map((ex, exIdx) => (
                                                    <div key={exIdx} className="example-item">
                                                        {ex}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Script de Resposta Sugerido por IA */}
                                        <div className="objection-details-section">
                                            <h4 className="objection-section-title">🧠 Quebra de Objeção Sugerida (IA)</h4>
                                            <div className="script-box">
                                                <p className="script-text">{cluster.suggested_script}</p>
                                            </div>
                                        </div>

                                        {/* Botão de Ação Rápida */}
                                        <div className="objection-card-actions">
                                            <button
                                                className="btn-objection-action save-rag"
                                                onClick={() => openRagModal(cluster)}
                                            >
                                                <span>📚</span>
                                                <span>Treinar Base de Conhecimento (RAG)</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal para Treinar RAG */}
            {isRagModalOpen && (
                <div className="rag-modal-overlay" onClick={() => setIsRagModalOpen(false)}>
                    <div className="rag-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="rag-modal-header">
                            <span className="rag-modal-icon">📚</span>
                            <h2 className="rag-modal-title">Treinar Base de Conhecimento</h2>
                        </div>

                        <form onSubmit={handleSaveToRag} className="rag-modal-form">
                            <div className="form-group-rag">
                                <label>Base de Conhecimento de Destino</label>
                                <select
                                    value={ragForm.kbId}
                                    onChange={(e) => setRagForm({...ragForm, kbId: e.target.value})}
                                    className="input-rag select-rag"
                                    required
                                >
                                    <option value="" disabled>Selecione uma base...</option>
                                    {knowledgeBases.map(kb => (
                                        <option key={kb.id} value={kb.id}>
                                            📁 {kb.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group-rag">
                                <label>Pergunta (Gatilho)</label>
                                <input
                                    type="text"
                                    value={ragForm.question}
                                    onChange={(e) => setRagForm({...ragForm, question: e.target.value})}
                                    className="input-rag"
                                    placeholder="Pergunta comum do lead"
                                    required
                                />
                            </div>

                            <div className="form-group-rag">
                                <label>Resposta Ideal (Quebra de Objeção)</label>
                                <textarea
                                    value={ragForm.answer}
                                    onChange={(e) => setRagForm({...ragForm, answer: e.target.value})}
                                    className="input-rag"
                                    placeholder="Escreva a resposta perfeita para o robô usar"
                                    rows={4}
                                    required
                                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div className="rag-modal-footer">
                                <button
                                    type="button"
                                    className="btn-rag-modal cancel"
                                    onClick={() => setIsRagModalOpen(false)}
                                    disabled={savingRag}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-rag-modal confirm"
                                    disabled={savingRag || !ragForm.kbId}
                                >
                                    {savingRag ? "Salvando..." : "Adicionar ao Conhecimento"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`global-toast global-toast-${toast.type === 'error' ? 'error' : 'success'}`}>
                    <span className="global-toast-icon">
                        {toast.type === 'error' ? '❌' : '✅'}
                    </span>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default ObjectionsDashboard;
