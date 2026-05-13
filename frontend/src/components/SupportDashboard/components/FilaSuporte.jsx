import React from 'react';
import { useSupport } from '../SupportContext';
import SupportCard from './SupportCard';

const FilaSuporte = () => {
    const { requests, selectedIds, setSelectedIds } = useSupport();

    const toggleAll = () => {
        if (selectedIds.length === requests.length) setSelectedIds([]);
        else setSelectedIds(requests.map(r => r.id));
    };

    if (requests.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>Tudo limpo!</h3>
                <p>Não há solicitações de suporte pendentes no momento.</p>
            </div>
        );
    }

    return (
        <div className="support-queue">
            <div className="queue-controls" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <button 
                    className="select-all-btn" 
                    onClick={toggleAll}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <div className={`selection-checkbox ${selectedIds.length === requests.length && requests.length > 0 ? 'selected' : ''}`} style={{ width: '18px', height: '18px' }}>
                        {selectedIds.length === requests.length && requests.length > 0 && "✓"}
                    </div>
                    Selecionar Todos ({requests.length})
                </button>
            </div>
            <div className="support-grid">
                {requests.map(req => (
                    <SupportCard key={req.id} request={req} />
                ))}
            </div>
        </div>
    );
};

export default FilaSuporte;
