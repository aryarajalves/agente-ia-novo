import React from 'react';
import { useFineTuning } from '../FineTuningContext';

const FeedbackList = () => {
    const { feedbackList, loading } = useFineTuning();

    if (loading && feedbackList.length === 0) return <div className="ft-loading">Carregando dataset...</div>;
    if (feedbackList.length === 0) return <div className="ft-empty-state">Nenhum feedback encontrado.</div>;

    return (
        <div className="ft-dataset-list">
            {feedbackList.map(item => (
                <div key={item.id} className={`ft-dataset-item ${item.rating}`}>
                    <div className="ft-item-header">
                        <span className="rating">{item.rating === 'positive' ? '👍' : '👎'}</span>
                        <div className="info">
                            <div className="agent">{item.agent_name}</div>
                            <div className="message">{item.user_message.slice(0, 100)}...</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FeedbackList;
