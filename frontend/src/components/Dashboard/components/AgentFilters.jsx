import React from 'react';
import { useDashboard } from '../DashboardContext';

import { api } from '../../../api/client';
import ConfirmModal from '../../ConfirmModal';

const AgentFilters = () => {
    const { 
        searchTerm, setSearchTerm, 
        modelFilter, setModelFilter, 
        agents, toggleSelectAll, 
        selectedAgents, setSelectedAgents,
        filteredAgents 
    } = useDashboard();
    
    const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const uniqueModels = [...new Set(agents.map(a => a.model))];
    const isAllSelected = filteredAgents.length > 0 && selectedAgents.size === filteredAgents.length;

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await api.post('/agents/batch-delete', { 
                agent_ids: Array.from(selectedAgents) 
            });
            if (response.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error("Erro ao excluir em lote:", err);
        } finally {
            setIsDeleting(false);
            setShowBulkConfirm(false);
        }
    };

    return (
        <div className="filter-bar">
            <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Buscar agente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button className="select-all-btn" onClick={toggleSelectAll}>
                <div className={`selection-checkbox ${isAllSelected ? 'selected' : ''}`} style={{ width: '18px', height: '18px' }}>
                    {isAllSelected && "✓"}
                </div>
                Selecionar Tudo
            </button>

            {selectedAgents.size > 0 && (
                <button 
                    className="bulk-delete-btn" 
                    onClick={() => setShowBulkConfirm(true)}
                    style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '0.65rem 1.2rem',
                        borderRadius: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s'
                    }}
                >
                    🗑️ Excluir Selecionados ({selectedAgents.size})
                </button>
            )}

            <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="filter-select-premium"
            >
                <option value="">Todos os Modelos</option>
                {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <button className="refresh-btn" onClick={() => window.location.reload()}>
                🔄
            </button>

            <ConfirmModal
                isOpen={showBulkConfirm}
                title="Confirmar Exclusão em Lote"
                message={`Deseja excluir permanentemente os ${selectedAgents.size} agentes selecionados?`}
                onConfirm={handleBulkDelete}
                onCancel={() => setShowBulkConfirm(false)}
                confirmText="Sim, Excluir Todos"
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AgentFilters;
