import React from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionActions } from '../hooks/useTranscriptionActions';

const TasksTable = () => {
    const { 
        tasks, selectedIds, itemsPerPage, totalTasks, currentPage, setCurrentPage 
    } = useTranscription();
    const { toggleSelectOne, toggleSelectAll } = useTranscriptionActions();

    const totalPages = Math.ceil(totalTasks / itemsPerPage);

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

    return (
        <div className="tasks-table-container">
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
                            <td>{task.filename}</td>
                            <td>{getStatusBadge(task.status)}</td>
                            <td>{task.created_at}</td>
                            <td>
                                {/* Actions placeholder */}
                                <span>...</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

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
