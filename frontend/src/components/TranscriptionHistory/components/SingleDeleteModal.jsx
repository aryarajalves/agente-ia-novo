import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';

const SingleDeleteModal = () => {
    const { taskToDelete, setTaskToDelete, setTasks, setSelectedIds } = useTranscription();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!taskToDelete) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            const response = await api.post('/transcription-tasks/bulk-delete', {
                task_ids: [taskToDelete.id]
            });
            if (response.ok) {
                // Toast de sucesso
                window.dispatchEvent(new CustomEvent('app:toast', { 
                    detail: { message: 'Transcrição excluída com sucesso!', type: 'success' } 
                }));
                // Remove da lista
                setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
                // Limpa do selectedIds se estivesse selecionado
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(taskToDelete.id);
                    return next;
                });
                setTaskToDelete(null);
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', { 
                    detail: { message: 'Falha ao excluir a transcrição.', type: 'error' } 
                }));
            }
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', { 
                detail: { message: 'Erro de conexão com o servidor.', type: 'error' } 
            }));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-content" style={{
                background: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '2.5rem', borderRadius: '24px', width: '450px', textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.1)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                <h2 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Excluir Arquivo</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Deseja realmente excluir a transcrição de <strong style={{ color: 'white' }}>"{taskToDelete.filename}"</strong>? Esta ação é irreversível e apagará o registro definitivamente.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button 
                        onClick={() => setTaskToDelete(null)} 
                        className="refresh-btn"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isDeleting}
                        className="create-btn"
                        style={{ 
                            background: '#ef4444', 
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SingleDeleteModal;
