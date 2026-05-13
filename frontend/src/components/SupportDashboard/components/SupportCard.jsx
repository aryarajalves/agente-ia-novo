import React, { useState, useEffect } from 'react';
import { useSupport } from '../SupportContext';
import { useSupportActions } from '../hooks/useSupportActions';

const SupportCard = ({ request }) => {
    const { selectedIds, setSelectedIds, setConfirmResolve, setConfirmDelete, setErrorLogsModal } = useSupport();
    const { resolveTicket } = useSupportActions();
    const [timeAgo, setTimeAgo] = useState('');
    const [isOld, setIsOld] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (!request.created_at) return;
            const start = new Date(request.created_at);
            const now = new Date();
            const diffMs = now - start;
            
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);
            
            if (diffHrs >= 24) setIsOld(true);

            if (diffMin < 1) setTimeAgo('agora mesmo');
            else if (diffMin < 60) setTimeAgo(`${diffMin} min atrás`);
            else if (diffHrs < 24) setTimeAgo(`${diffHrs}h ${diffMin % 60}m atrás`);
            else setTimeAgo(`${Math.floor(diffHrs / 24)} dias atrás`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [request.created_at]);

    const isSelected = selectedIds.includes(request.id);

    const toggleSelection = () => {
        setSelectedIds(prev => isSelected ? prev.filter(id => id !== request.id) : [...prev, request.id]);
    };

    const formatFullDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`support-card ${isSelected ? 'selected' : ''} ${isOld ? 'priority-old' : ''}`}>
            <div className="card-header">
                <div 
                    className={`selection-checkbox ${isSelected ? 'selected' : ''}`} 
                    onClick={toggleSelection}
                    style={{ cursor: 'pointer' }}
                >
                    {isSelected && "✓"}
                </div>
                <div className="user-avatar">
                    {request.user_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="user-meta">
                    <div className="title-row">
                        <h3>{request.user_name || 'Usuário Anônimo'}</h3>
                        <span className="waiting-time">🕒 {timeAgo}</span>
                    </div>
                    <span>{request.user_email || 'E-mail não informado'}</span>
                </div>
            </div>
            
            <div className="card-body">
                <p><strong>Motivo:</strong> {request.reason || 'Aguardando diagnóstico...'}</p>
                <div className="extracted-data">
                    {request.extracted_data && Object.entries(request.extracted_data).map(([k, v]) => (
                        <span key={k} className="data-tag">
                            <strong>{k}:</strong> {String(v)}
                        </span>
                    ))}
                </div>
                
                {isOld && (
                    <div className="old-request-info">
                        📅 Solicitado em: {formatFullDate(request.created_at)}
                    </div>
                )}
            </div>
            
            <div className="card-footer">
                <button 
                    onClick={() => setErrorLogsModal(request)} 
                    className="btn-logs"
                    title="Ver histórico e logs"
                >
                    📋 Logs
                </button>
                <button 
                    onClick={() => setConfirmResolve(request)} 
                    className="btn-resolve"
                >
                    Finalizar Atendimento
                </button>
            </div>
        </div>
    );
};

export default SupportCard;
