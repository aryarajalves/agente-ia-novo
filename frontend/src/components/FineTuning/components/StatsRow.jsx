import React from 'react';
import { useFineTuning } from '../FineTuningContext';

const StatsRow = () => {
    const { feedbackList } = useFineTuning();

    const stats = {
        total: feedbackList.length,
        positive: feedbackList.filter(f => f.rating === 'positive').length,
        negative: feedbackList.filter(f => f.rating === 'negative').length,
        withCorrection: feedbackList.filter(f => f.corrected_response).length,
        ready: feedbackList.filter(f => !f.exported_to_finetune && f.corrected_response).length
    };

    return (
        <div className="ft-stats-row">
            <div className="ft-stat-card">
                <div className="ft-stat-value">{stats.total}</div>
                <div className="ft-stat-label">Total de Exemplos</div>
            </div>
            <div className="ft-stat-card positive">
                <div className="ft-stat-value">{stats.positive}</div>
                <div className="ft-stat-label">👍 Positivos</div>
            </div>
            <div className="ft-stat-card negative">
                <div className="ft-stat-value">{stats.negative}</div>
                <div className="ft-stat-label">👎 Negativos</div>
            </div>
            <div className="ft-stat-card ready">
                <div className="ft-stat-value">{stats.withCorrection}</div>
                <div className="ft-stat-label">✏️ Com Correção</div>
            </div>
        </div>
    );
};

export default StatsRow;
