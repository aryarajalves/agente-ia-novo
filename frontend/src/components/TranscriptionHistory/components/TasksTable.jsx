import React from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionActions } from '../hooks/useTranscriptionActions';
import { uploadManager } from '../../../api/uploadManager';

const TasksTable = () => {
    const { tasks, selectedIds, itemsPerPage, setItemsPerPage, totalTasks, currentPage, setCurrentPage, activeUploads, setTaskToDelete, setSelectedTaskForView, setIsTrainingModalOpen, setTaskForTraining } = useTranscription();
    const { toggleSelectOne, toggleSelectAll, handleSaveRename, handleRetry } = useTranscriptionActions();

    const totalPages = Math.ceil(totalTasks / itemsPerPage);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear().toString().slice(-2);
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            return `${d}/${m}/${y} ${hh}:${mm}`;
        } catch (e) {
            return dateString;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', label: '⏳ Na Fila' },
            PROCESSING: { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', label: '⚙️ Processando' },
            SUCCESS: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: '✅ Concluído' },
            FAILURE: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: '❌ Erro' }
        };
        const style = styles[status] || { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: status };
        
        return (
            <span className="status-badge" style={{ background: style.bg, color: style.color }}>
                {style.label}
            </span>
        );
    };

    const [editingId, setEditingId] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');

    const startEditing = (task) => {
        setEditingId(task.id);
        setEditValue(task.filename);
    };

    const saveRename = async (id) => {
        if (!editValue.trim()) return;
        try {
            const success = await handleSaveRename(id, editValue.trim());
            if (success) {
                setEditingId(null);
            } else {
                alert('Erro ao renomear arquivo: O servidor não aceitou a alteração (Verifique a conexão ou permissões).');
            }
        } catch (err) {
            alert('Erro crítico ao tentar renomear. Tente novamente mais tarde.');
        }
    };

    return (
        <div className="tasks-table-container">
            {tasks.length === 0 && activeUploads.length === 0 ? (
                <div className="empty-state-card">
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>📑</div>
                    <div>
                        <h2 className="empty-title">Histórico Vazio</h2>
                        <p className="empty-subtitle">
                            Você ainda não realizou nenhuma transcrição manual ou upload de arquivos para processamento.
                        </p>
                    </div>
                </div>
            ) : (
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th>
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size === tasks.length && tasks.length > 0}
                                    onChange={() => toggleSelectAll(tasks)}
                                />
                            </th>
                            <th>Arquivo</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th>Custo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeUploads.map(upload => (
                            <tr key={upload.id} className="active-upload-row">
                                <td>
                                    <input 
                                        type="checkbox" 
                                        disabled 
                                    />
                                </td>
                                <td>
                                    <div className="filename-row">
                                        <span className="filename-text" style={{ opacity: 0.8 }}>{upload.filename}</span>
                                    </div>
                                    {upload.status === 'uploading' && (
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: `${upload.progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {upload.status === 'uploading' ? (
                                        <span className="status-badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                            📤 Enviando {upload.progress}%
                                        </span>
                                    ) : (
                                        <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }} title={upload.error}>
                                            ❌ Erro no Envio
                                        </span>
                                    )}
                                </td>
                                <td style={{ whiteSpace: 'nowrap', opacity: 0.6 }}>{formatDate(upload.created_at)}</td>
                                <td style={{ whiteSpace: 'nowrap', opacity: 0.5 }}>-</td>
                                <td>
                                    <div className="row-actions">
                                        {upload.status === 'error' && (
                                            <button 
                                                className="cancel-edit-btn" 
                                                onClick={() => uploadManager.removeUpload(upload.id)}
                                                title="Remover erro"
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                            >
                                                ❌
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tasks.map(task => (
                            <tr key={task.id}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(task.id)}
                                        onChange={() => toggleSelectOne(task.id)}
                                    />
                                </td>
                                <td>
                                    {editingId === task.id ? (
                                        <div className="edit-name-row">
                                            <input 
                                                type="text" 
                                                value={editValue} 
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveRename(task.id)}
                                                autoFocus
                                            />
                                            <button className="save-edit-btn" onClick={() => saveRename(task.id)}>💾</button>
                                            <button className="cancel-edit-btn" onClick={() => setEditingId(null)}>❌</button>
                                        </div>
                                    ) : (
                                        <div className="filename-row">
                                            <span className="filename-text">{task.filename}</span>
                                            <button className="edit-name-btn" onClick={() => startEditing(task)}>✏️</button>
                                        </div>
                                    )}
                                </td>
                                <td>{getStatusBadge(task.status)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(task.created_at)}</td>
                                <td style={{ whiteSpace: 'nowrap', color: '#10b981', fontWeight: '500' }}>
                                    {task.cost_usd ? `$${task.cost_usd.toFixed(4)}` : '$0.0000'}
                                </td>
                                <td>
                                    <div className="row-actions">
                                        {task.status === 'SUCCESS' && (
                                            <>
                                                <button 
                                                    className="view-transcription-btn" 
                                                    onClick={() => setSelectedTaskForView(task)}
                                                    title="Visualizar transcrição"
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#60a5fa',
                                                        fontSize: '1rem',
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        transition: 'all 0.2s ease',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '4px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = 'rgba(96, 165, 250, 0.15)';
                                                        e.target.style.transform = 'scale(1.15)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'transparent';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    📝
                                                </button>
                                                <button 
                                                    className="train-ai-btn" 
                                                    onClick={() => {
                                                        setTaskForTraining(task);
                                                        setIsTrainingModalOpen(true);
                                                    }}
                                                    title="Treinamento com IA"
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#c084fc',
                                                        fontSize: '1rem',
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        transition: 'all 0.2s ease',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '4px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = 'rgba(192, 132, 252, 0.15)';
                                                        e.target.style.transform = 'scale(1.15)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'transparent';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    🧠
                                                </button>
                                            </>
                                        )}
                                        {task.status === 'FAILURE' && (
                                            <button 
                                                className="retry-btn" 
                                                onClick={() => handleRetry(task.id)}
                                                title="Tentar transcrever novamente"
                                            >
                                                🔄
                                            </button>
                                        )}
                                        <button 
                                            className="delete-item-btn" 
                                            onClick={() => setTaskToDelete(task)}
                                            title="Excluir transcrição"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ef4444',
                                                fontSize: '1rem',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                                                e.target.style.transform = 'scale(1.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'transparent';
                                                e.target.style.transform = 'scale(1)';
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {tasks.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '1.5rem', 
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    flexWrap: 'wrap', 
                    gap: '1rem' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <span>Exibir:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1); // Reseta para a primeira página ao mudar o limite
                            }}
                            style={{
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                color: 'white',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                outline: 'none',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.background = 'rgba(15, 23, 42, 0.95)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                e.target.style.background = 'rgba(15, 23, 42, 0.8)';
                            }}
                        >
                            <option value={20} style={{ background: '#0f172a' }}>20 arquivos</option>
                            <option value={50} style={{ background: '#0f172a' }}>50 arquivos</option>
                            <option value={100} style={{ background: '#0f172a' }}>100 arquivos</option>
                        </select>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: 0 }}>
                            <button 
                                disabled={currentPage === 1} 
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="pagination-btn"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: currentPage === 1 ? '#4b5563' : '#e2e8f0',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Anterior
                            </button>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0 8px' }}>
                                Página {currentPage} de {totalPages}
                            </span>
                            <button 
                                disabled={currentPage === totalPages} 
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="pagination-btn"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: currentPage === totalPages ? '#4b5563' : '#e2e8f0',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TasksTable;
