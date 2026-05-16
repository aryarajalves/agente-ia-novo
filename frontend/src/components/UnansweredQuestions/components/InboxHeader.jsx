import React, { useState } from 'react';
import { useQuestions } from '../QuestionsContext';

const InboxHeader = ({ onRefresh }) => {
    const { questions, loading, publicToken } = useQuestions();
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const handleCopyPublicLink = () => {
        if (!publicToken) return;
        const link = `${window.location.origin}/public/questions/${publicToken}`;
        navigator.clipboard.writeText(link);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 3000);
    };

    return (
        <div className="inbox-header">
            <div className="header-left">
                <div className="header-icon">📥</div>
                <div>
                    <h3>Inbox de Dúvidas</h3>
                    <p>{loading ? 'Carregando...' : `${questions.length} pendentes`}</p>
                </div>
            </div>
            <div className="header-actions">
                <button onClick={onRefresh} className="btn-refresh-new">
                    <span className="icon">🔄</span> Atualizar
                </button>
            </div>
        </div>
    );
};

export default InboxHeader;
