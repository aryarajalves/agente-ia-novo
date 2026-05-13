import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';

const AnalysisModal = ({ analysisData, setAnalysisData, agents, selectedAgentId }) => {
    if (!analysisData) return null;

    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [coverageResults, setCoverageResults] = useState(null);
    const [checkingCoverage, setCheckingCoverage] = useState(false);
    const [newItemData, setNewItemData] = useState(null);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [fetchingKBs, setFetchingKBs] = useState(false);

    const handleClose = () => {
        setAnalysisData(null);
        setCoverageResults(null);
    };

    useEffect(() => {
        setCoverageResults(null);
        setFetchingKBs(true);
        api.get(`/knowledge-bases`)
            .then(res => res.json())
            .then(data => setKnowledgeBases(data))
            .catch(err => console.error("Erro ao carregar bases:", err))
            .finally(() => setFetchingKBs(false));
    }, [analysisData, setAnalysisData]);

    const copyToClipboard = async (text, index = null) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            if (index !== null) {
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 2000);
            } else {
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleCopyAll = () => {
        if (analysisData.type === 'questions' && Array.isArray(analysisData.content)) {
            copyToClipboard(analysisData.content.join('\n'));
        } else if (analysisData.type === 'summary') {
            copyToClipboard(analysisData.content);
        }
    };

    const checkCoverage = async () => {
        const agent = agents.find(a => a.id === selectedAgentId);
        if (!agent) return alert("Agente não encontrado");
        const kbId = agent.knowledge_base_ids?.[0] || agent.knowledge_base_id;
        if (!kbId) return alert("Este agente não tem Base de Conhecimento vinculada.");

        setCheckingCoverage(true);
        try {
            const res = await api.post(`/knowledge-bases/${kbId}/coverage`, {
                questions: analysisData.content
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const map = {};
            data.results.forEach(r => map[r.question] = r);
            setCoverageResults(map);
        } catch (e) {
            console.error(e);
            alert("Erro ao verificar cobertura: " + e.message);
        } finally {
            setCheckingCoverage(false);
        }
    };

    const handleAddItem = (question) => {
        const agent = agents.find(a => a.id === selectedAgentId);
        const defaultKbId = agent?.knowledge_base_ids?.[0] || agent?.knowledge_base_id;
        setNewItemData({
            question: question,
            answer: "",
            category: "Descoberta",
            target_kb_id: defaultKbId || (knowledgeBases[0]?.id)
        });
    };

    const saveNewItem = async () => {
        if (!newItemData?.answer) return alert("Digite uma resposta.");
        setIsSavingItem(true);
        try {
            const targetKbId = newItemData.target_kb_id;
            await api.post(`/knowledge-bases/${targetKbId}/items`, {
                question: newItemData.question,
                answer: newItemData.answer,
                category: newItemData.category
            });

            setCoverageResults(prev => ({
                ...prev,
                [newItemData.question]: { 
                    ...prev[newItemData.question], 
                    status: 'green', 
                    best_match: { answer: newItemData.answer } 
                }
            }));
            setNewItemData(null);
        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSavingItem(false);
        }
    };

    return (
        <div className="modal-overlay fade-in">
            <div className="modal-content analysis-modal">
                {newItemData && (
                    <div className="new-item-overlay fade-in">
                        <div className="new-item-card">
                            <h4>✨ Transformar em Conhecimento</h4>
                            <div className="form-group">
                                <label>Pergunta / Chave</label>
                                <textarea
                                    value={newItemData.question}
                                    onChange={e => setNewItemData({ ...newItemData, question: e.target.value })}
                                    placeholder="Edite a pergunta se necessário..."
                                    style={{ minHeight: '60px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Resposta / Conteúdo</label>
                                <textarea
                                    autoFocus
                                    placeholder="Digite a resposta correta para esta dúvida..."
                                    value={newItemData.answer}
                                    onChange={e => setNewItemData({ ...newItemData, answer: e.target.value })}
                                    style={{ minHeight: '100px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Salvar na Base de Conhecimento</label>
                                <select
                                    className="kb-select"
                                    value={newItemData.target_kb_id}
                                    onChange={e => setNewItemData({ ...newItemData, target_kb_id: e.target.value })}
                                >
                                    {knowledgeBases.map(kb => (
                                        <option key={kb.id} value={kb.id}>
                                            {kb.name} {agents.find(a => a.id === selectedAgentId)?.knowledge_base_ids?.includes(kb.id) ? '(Atual)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="new-item-actions">
                                <button onClick={() => setNewItemData(null)} className="cancel-btn">Cancelar</button>
                                <button onClick={saveNewItem} className="save-btn" disabled={isSavingItem}>
                                    {isSavingItem ? 'Salvando...' : '💾 Salvar na Base'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="modal-header">
                    <button onClick={handleClose} className="close-btn-top-right" title="Fechar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <div className="header-title">
                        {analysisData.type === 'summary' && <div className="icon-badge summary-badge">📝</div>}
                        {analysisData.type === 'questions' && <div className="icon-badge questions-badge">❓</div>}
                        {analysisData.type === 'error' && <div className="icon-badge error-badge">❌</div>}

                        <div className="header-text">
                            <h3>
                                {analysisData.type === 'summary' && 'Resumo Inteligente'}
                                {analysisData.type === 'questions' && 'Perguntas Detectadas'}
                                {analysisData.type === 'error' && 'Erro na Análise'}
                            </h3>
                            <p className="subtitle">
                                {analysisData.type === 'summary' && 'Síntese gerada por IA da conversa atual'}
                                {analysisData.type === 'questions' && `${analysisData.content?.length || 0} perguntas identificadas no contexto`}
                                {analysisData.type === 'error' && 'Ocorreu um problema ao processar'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="modal-body-scroll">
                    {analysisData.loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Analisando conversa...</p>
                        </div>
                    ) : (
                        <>
                            {analysisData.type === 'summary' && (
                                <div className="summary-content">
                                    {analysisData.content.split('\n').map((para, i) => (
                                        para.trim() && <p key={i}>{para}</p>
                                    ))}
                                </div>
                            )}

                            {analysisData.type === 'questions' && (
                                <div className="questions-list">
                                    {!coverageResults && (
                                        <div className="coverage-action-area">
                                            <button className="check-coverage-btn" onClick={checkCoverage} disabled={checkingCoverage}>
                                                {checkingCoverage ? <div className="spinner-mini"></div> : '🔍'}
                                                {checkingCoverage ? 'Verificando...' : 'Verificar Cobertura na Base'}
                                            </button>
                                        </div>
                                    )}

                                    {analysisData.content.length > 0 ? (
                                        analysisData.content.map((q, i) => {
                                            const coverage = coverageResults?.[q];
                                            let badge = null;
                                            if (coverage) {
                                                if (coverage.status === 'green') badge = <span className="status-badge green" title="Já coberto">🟢 Coberto</span>;
                                                else if (coverage.status === 'yellow') badge = <span className="status-badge yellow" title="Parcialmente coberto">🟡 Parcial</span>;
                                                else badge = <span className="status-badge red" title="Sem resposta na base">🔴 Sem Resposta</span>;
                                            }

                                            return (
                                                <div key={i} className={`question-card ${coverage?.status || ''}`}>
                                                    <div className="q-content">
                                                        <div className="q-header">
                                                            <span className="q-number">#{i + 1}</span>
                                                            {badge}
                                                        </div>
                                                        <p>{q}</p>
                                                        {coverage?.status === 'green' && (
                                                            <div className="match-preview">
                                                                ✅ <strong>Base{coverage.best_match?.metadata?.page ? ` (Pág ${coverage.best_match.metadata.page})` : ''}:</strong> {coverage.best_match?.answer.substring(0, 100)}...
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="q-actions">
                                                        {coverage?.status === 'red' && (
                                                            <button
                                                                className="add-kb-btn"
                                                                onClick={() => handleAddItem(q)}
                                                                title="Adicionar à Base"
                                                            >
                                                                📥 Aprender
                                                            </button>
                                                        )}
                                                        <button
                                                            className={`copy-icon-btn ${copiedIndex === i ? 'copied' : ''}`}
                                                            onClick={() => copyToClipboard(q, i)}
                                                            title="Copiar texto"
                                                        >
                                                            {copiedIndex === i ? '✅' : '📋'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="empty-state">
                                            <div className="empty-icon">🔍</div>
                                            <p>Nenhuma pergunta encontrada nesta conversa.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {analysisData.type === 'error' && (
                                <div className="error-state">
                                    <p>{analysisData.content}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {!analysisData.loading && analysisData.type !== 'error' && (
                        <button className={`secondary-action-btn ${copiedAll ? 'success' : ''}`} onClick={handleCopyAll}>
                            {copiedAll ? (
                                <><span>✅</span> Copiado!</>
                            ) : (
                                <><span>📋</span> Copiar {analysisData.type === 'questions' ? 'Todas' : 'Texto'}</>
                            )}
                        </button>
                    )}
                    <button className="primary-close-btn" onClick={handleClose}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;
