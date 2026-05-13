import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestionsActions } from '../hooks/useQuestionsActions';

const QuestionCard = ({ question, index }) => {
    const navigate = useNavigate();
    const { openModal } = useQuestionsActions();

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="uq-card" style={{ animationDelay: `${index * 0.06}s` }}>
            <div className="uq-card-meta">
                <span className="uq-badge">⚠️ Pendente</span>
                {question.agent_id && <span className="uq-agent-tag">🤖 Agente #{question.agent_id}</span>}
                <span className="uq-date">🕐 {formatDate(question.created_at)}</span>
            </div>

            <div className="uq-question-text">💬 {question.question}</div>

            <div className="uq-actions">
                <button className="uq-btn-teach" onClick={() => openModal(question, 'answer')}>Ensinar Resposta</button>
                <button className="uq-btn-discard" onClick={() => openModal(question, 'discard')}>Descartar</button>
                {question.session_id && (
                    <button 
                        className="uq-btn-context"
                        onClick={() => navigate(`/playground?session_id=${question.session_id}&agent_id=${question.agent_id || ''}&view_mode=true`)}
                    >🔍 Ver Conversa</button>
                )}
            </div>
        </div>
    );
};

export default QuestionCard;
