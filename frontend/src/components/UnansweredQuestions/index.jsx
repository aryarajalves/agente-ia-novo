import React from 'react';
import { QuestionsProvider, useQuestions } from './QuestionsContext';
import { useQuestionsData } from './hooks/useQuestionsData';
import { useQuestionsActions } from './hooks/useQuestionsActions';
import InboxHeader from './components/InboxHeader';
import QuestionCard from './components/QuestionCard';
import './styles/UnansweredQuestions.css';

const InboxContent = () => {
    const { questions, loading, activeModal, setActiveModal, teachMode, setTeachMode, answerText, setAnswerText, editingQuestionText, setEditingQuestionText, kbList, agents, selectedKbId, setSelectedKbId, selectedAgentId, setSelectedAgentId, saving } = useQuestions();
    const { fetchQuestions } = useQuestionsData();
    const { handleAnswerSubmit, handleDiscard } = useQuestionsActions();

    if (loading && questions.length === 0) return <div className="loading-state">Carregando Inbox...</div>;

    return (
        <div className="unanswered-questions-page fade-in">
            <InboxHeader onRefresh={fetchQuestions} />

            {questions.length === 0 ? (
                <div className="empty-inbox">🎉 Inbox Zerado! Tudo respondido.</div>
            ) : (
                <div className="questions-list">
                    {questions.map((q, idx) => (
                        <QuestionCard key={q.id} question={q} index={idx} />
                    ))}
                </div>
            )}

            {activeModal === 'answer' && (
                <div className="uq-modal-overlay">
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
                                    {kbList.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
                                </select>
                            ) : (
                                <select className="uq-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            )}
                        </div>
                        <div className="uq-modal-footer">
                            <button onClick={() => setActiveModal(null)}>Cancelar</button>
                            <button onClick={handleAnswerSubmit} disabled={saving}>Salvar e Ensinar</button>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'discard' && (
                <div className="uq-modal-overlay">
                    <div className="uq-modal" onClick={e => e.stopPropagation()}>
                        <h3>Descartar Dúvida?</h3>
                        <p>Esta ação não pode ser desfeita.</p>
                        <div className="uq-modal-footer">
                            <button onClick={() => setActiveModal(null)}>Cancelar</button>
                            <button onClick={handleDiscard} className="danger">Sim, Descartar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UnansweredQuestions = () => (
    <QuestionsProvider>
        <InboxContent />
    </QuestionsProvider>
);

export default UnansweredQuestions;
