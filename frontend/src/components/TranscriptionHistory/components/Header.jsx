import React from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionData } from '../hooks/useTranscriptionData';

const Header = () => {
    const { 
        loading, isRefreshing, selectedIds, 
        setShowBulkDeleteModal, setIsBatchRagModalOpen, 
        setShowManualModal 
    } = useTranscription();
    const { fetchTasks } = useTranscriptionData();

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: 0 }}>
                📑 Histórico de Transcrições
                {loading && <span style={{ fontSize: '0.8rem', color: '#6366f1' }}>🔄 Atualizando...</span>}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
                {selectedIds.size > 0 && (
                    <button onClick={() => setShowBulkDeleteModal(true)} className="bulk-action-btn danger">
                        🗑️ Remover Selecionados ({selectedIds.size})
                    </button>
                )}
                {selectedIds.size > 1 && (
                    <button onClick={() => setIsBatchRagModalOpen(true)} className="bulk-action-btn primary">
                        🚀 Resumo em Lote ({selectedIds.size})
                    </button>
                )}
                <button onClick={() => fetchTasks()} className="refresh-btn" disabled={isRefreshing}>
                    {isRefreshing ? '🎡 Atualizando...' : '🔄 Atualizar Agora'}
                </button>
                <button onClick={() => setShowManualModal(true)} className="create-btn">
                    ➕ Nova Transcrição Manual
                </button>
            </div>
        </div>
    );
};

export default Header;
