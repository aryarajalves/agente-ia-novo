import React from 'react';
import '../styles/bulk_toolbar.css';

const BulkActionToolbar = ({
    selectedWebhooks,
    webhooks,
    toggleSelectAllWebhooks,
    onBulkDelete,
    onClearSelection
}) => {
    if (selectedWebhooks.size === 0) return null;

    const allSelected = webhooks.length > 0 && webhooks.every(w => selectedWebhooks.has(w.id));

    return (
        <div className="bulk-toolbar-premium">
            <div className="bulk-info-group">
                <div 
                    onClick={toggleSelectAllWebhooks}
                    className="select-all-toggle"
                >
                    <div className={`bulk-checkbox-ui ${allSelected ? 'active' : ''}`}>
                        {allSelected && <span>✓</span>}
                    </div>
                    <span className="bulk-count-text" style={{ color: '#fca5a5' }}>Selecionar Tudo</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(239, 68, 68, 0.2)' }} />
                <span className="bulk-count-text">
                    {selectedWebhooks.size} integraç{selectedWebhooks.size === 1 ? 'ão' : 'ões'} selecionada{selectedWebhooks.size === 1 ? '' : 's'}
                </span>
            </div>
            
            <div className="bulk-actions-group">
                <button
                    onClick={onClearSelection}
                    className="btn-bulk-cancel"
                >
                    Cancelar
                </button>
                <button
                    onClick={onBulkDelete}
                    className="btn-bulk-delete"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Excluir Selecionadas
                </button>
            </div>
        </div>
    );

};

export default BulkActionToolbar;
