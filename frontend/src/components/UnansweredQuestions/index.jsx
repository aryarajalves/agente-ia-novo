import React from 'react';
import { QuestionsProvider, useQuestions } from './QuestionsContext';
import { useQuestionsData } from './hooks/useQuestionsData';
import { useQuestionsActions } from './hooks/useQuestionsActions';
import InboxHeader from './components/InboxHeader';
import QuestionCard from './components/QuestionCard';
import './styles/UnansweredQuestions.css';

import { createPortal } from 'react-dom';

const InboxContent = () => {
    const { 
        questions, loading, activeModal, setActiveModal, teachMode, setTeachMode, 
        answerText, setAnswerText, editingQuestionText, setEditingQuestionText, 
        kbList, agents, selectedKbId, setSelectedKbId, selectedAgentId, setSelectedAgentId, 
        saving, limit, setLimit, page, setPage, totalCount, selectedIds 
    } = useQuestions();
    const { fetchQuestions } = useQuestionsData();
    const { handleAnswerSubmit, handleDiscard, handleBulkDiscard } = useQuestionsActions();

    if (loading && questions.length === 0) return <div className="loading-state">Carregando Inbox...</div>;

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const handleOverlayClick = (e) => {
        // NÃO fechar se for modal de deleção (discard / bulk_discard) ao clicar fora
        if (activeModal === 'discard' || activeModal === 'bulk_discard') {
            return;
        }
        setActiveModal(null);
    };

    const renderModals = () => {
        if (!activeModal) return null;

        return createPortal(
            <div className="uq-modal-overlay" onClick={handleOverlayClick}>
                {activeModal === 'answer' && (
                    <div className="uq-modal" onClick={e => e.stopPropagation()}>
                        <div className="uq-modal-header">
                            <h3>Ensinar Resposta</h3>
                        </div>
                        <div className="teach-mode-tabs">
                            <button className={teachMode === 'rag' ? 'active' : ''} onClick={() => setTeachMode('rag')}>📚 Base (RAG)</button>
                            <button className={teachMode === 'agent' ? 'active' : ''} onClick={() => setTeachMode('agent')}>🤖 Prompt Agente</button>
                        </div>
                        <div className="modal-body">
                            <label>Pergunta:</label>
                            <input className="uq-input" value={editingQuestionText} onChange={e => setEditingQuestionText(e.target.value)} />
                            <label>Resposta:</label>
                            <textarea className="uq-textarea" value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="Resposta oficial..." />
                            
                             {teachMode === 'rag' ? (
                                <select className="uq-select" value={selectedKbId} onChange={e => setSelectedKbId(e.target.value)}>
                                    {kbList.length === 0 && <option value="">Carregando bases...</option>}
                                    {kbList.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
                                </select>
                            ) : (
                                <select className="uq-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
                                    {agents.length === 0 && <option value="">Carregando agentes...</option>}
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            )}
                        </div>
                        <div className="uq-modal-footer">
                            <button onClick={() => setActiveModal(null)}>Cancelar</button>
                            <button onClick={handleAnswerSubmit} disabled={saving}>Salvar e Ensinar</button>
                        </div>
                    </div>
                )}

                {activeModal === 'discard' && (
                    <div className="uq-modal" onClick={e => e.stopPropagation()}>
                        <h3>Descartar Dúvida?</h3>
                        <p>Esta ação não pode ser desfeita.</p>
                        <div className="uq-modal-footer">
                            <button onClick={() => setActiveModal(null)}>Cancelar</button>
                            <button onClick={handleDiscard} className="danger" disabled={saving}>
                                {saving ? 'Descartando...' : 'Sim, Descartar'}
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'bulk_discard' && (
                    <div className="uq-modal" onClick={e => e.stopPropagation()}>
                        <h3>Descartar dúvidas selecionadas?</h3>
                        <p>Você tem certeza que deseja descartar as {selectedIds.size} dúvidas selecionadas? Esta ação não pode ser desfeita.</p>
                        <div className="uq-modal-footer">
                            <button onClick={() => setActiveModal(null)}>Cancelar</button>
                            <button onClick={handleBulkDiscard} className="danger" disabled={saving}>
                                {saving ? 'Descartando...' : 'Sim, Descartar Todas'}
                            </button>
                        </div>
                    </div>
                )}
            </div>,
            document.body
        );
    };

    return (
        <div className="unanswered-questions-page fade-in">
            <InboxHeader onRefresh={fetchQuestions} />

            {questions.length === 0 ? (
                <div className="empty-inbox">🎉 Inbox Zerado! Tudo respondido.</div>
            ) : (
                <>
                    <div className="questions-list">
                        {questions.map((q, idx) => (
                            <QuestionCard key={q.id} question={q} index={idx} />
                        ))}
                    </div>

                    <div className="uq-pagination-container">
                        <div className="uq-pagination-limit">
                            <span className="limit-label">Mostrar:</span>
                            <select 
                                value={limit} 
                                onChange={e => {
                                    setLimit(parseInt(e.target.value));
                                    setPage(1);
                                }}
                                className="uq-pagination-select"
                            >
                                <option value={20}>20 dúvidas</option>
                                <option value={50}>50 dúvidas</option>
                                <option value={100}>100 dúvidas</option>
                            </select>
                        </div>

                        <div className="uq-pagination-navigation">
                            <button 
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                                disabled={page === 1}
                                className="uq-page-btn"
                            >
                                ◀ Anterior
                            </button>
                            <span className="uq-page-info">
                                Página {page} de {totalPages}
                            </span>
                            <button 
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={page === totalPages || questions.length < limit}
                                className="uq-page-btn"
                            >
                                Próxima ▶
                            </button>
                        </div>
                    </div>
                </>
            )}

            {renderModals()}
        </div>
    );
};

const UnansweredQuestions = () => (
    <QuestionsProvider>
        <InboxContent />
    </QuestionsProvider>
);

export default UnansweredQuestions;
