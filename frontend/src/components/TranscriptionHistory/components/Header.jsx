import React, { useRef } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionData } from '../hooks/useTranscriptionData';
import { uploadManager } from '../../../api/uploadManager';

const Header = () => {
    const { 
        loading, isRefreshing, selectedIds, 
        setShowBulkDeleteModal, setIsBatchRagModalOpen 
    } = useTranscription();
    const { fetchTasks } = useTranscriptionData();
    const fileInputRef = useRef(null);

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadManager.startUpload(null, file, {
            language: 'pt',
            summarize: true,
            generate_qa: true
        });

        // Limpa o input de arquivo
        e.target.value = '';
    };

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
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="video/*,audio/*" 
                    onChange={handleVideoUpload} 
                />
                <button onClick={() => fileInputRef.current.click()} className="create-btn" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                    📤 Upload de Vídeo
                </button>
            </div>
        </div>
    );
};

export default Header;
