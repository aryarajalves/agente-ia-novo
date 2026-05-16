import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';


const BulkDeleteModal = () => {
    const { showBulkDeleteModal, setShowBulkDeleteModal, selectedIds, setSelectedIds, setTasks } = useTranscription();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!showBulkDeleteModal) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            const response = await api.post('/transcription-tasks/bulk-delete', {
                task_ids: Array.from(selectedIds)
            });
            if (response.ok) {
                alert('Registros removidos com sucesso');
                setTasks(prev => prev.filter(t => !selectedIds.has(t.id)));
                setSelectedIds(new Set());
                setShowBulkDeleteModal(false);
            } else {
                alert('Falha ao remover registros');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-content" style={{
                background: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '2.5rem', borderRadius: '24px', width: '450px', textAlign: 'center'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                <h2 style={{ color: 'white', marginBottom: '1rem' }}>Excluir Registros</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                    Deseja realmente excluir <strong>{selectedIds.size}</strong> registros selecionados? Esta ação não pode ser desfeita.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button 
                        onClick={() => setShowBulkDeleteModal(false)} 
                        className="refresh-btn"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isDeleting}
                        className="create-btn"
                        style={{ background: '#ef4444', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
                    >
                        {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteModal;
