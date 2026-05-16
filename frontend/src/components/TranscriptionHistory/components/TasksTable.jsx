import React from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionActions } from '../hooks/useTranscriptionActions';

const TasksTable = () => {
    const { tasks, selectedIds, itemsPerPage, totalTasks, currentPage, setCurrentPage } = useTranscription();
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
            {tasks.length === 0 ? (
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
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
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
                                <td>
                                    <div className="row-actions">
                                        {task.status === 'FAILURE' && (
                                            <button 
                                                className="retry-btn" 
                                                onClick={() => handleRetry(task.id)}
                                                title="Tentar transcrever novamente"
                                            >
                                                🔄
                                            </button>
                                        )}
                                        <button className="action-dot-btn" title="Ações">...</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                    <span>Página {currentPage} de {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</button>
                </div>
            )}
        </div>
    );
};

export default TasksTable;
