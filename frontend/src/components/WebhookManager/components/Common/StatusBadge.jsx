import React from 'react';

const StatusBadge = ({ status }) => {
    const map = {
        received: { label: 'Recebido', color: '#6366f1' },
        pending: { label: 'Pendente', color: '#f59e0b' },
        processing: { label: 'Processando', color: '#3b82f6' },
        completed: { label: 'Processado', color: '#22c55e' },
        processed: { label: 'Processado', color: '#22c55e' },
        cancelled: { label: 'Cancelado', color: '#94a3b8' },
        error: { label: 'Erro', color: '#ef4444' },
        ignored: { label: 'Ignorado', color: '#fb7185' },
    };
    const s = map[status] || { label: status, color: '#94a3b8' };
    return (
        <span style={{
            background: s.color + '22',
            color: s.color,
            border: `1px solid ${s.color}44`,
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
        }}>{s.label}</span>
    );
};

export default StatusBadge;
