import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';

export const useTranscriptionActions = () => {
    const {
        setTasks, tasksRef, setSelectedIds, selectedIds,
        setTaskToDelete, setIsDeleting, fetchTasks,
        currentPage, itemsPerPage
    } = useTranscription();

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (tasks) => {
        if (selectedIds.size === tasks.length && tasks.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tasks.map(t => t.id)));
        }
    };

    const confirmDelete = async (taskToDelete) => {
        if (!taskToDelete) return;
        setIsDeleting(true);
        try {
            const res = await api.delete(`/transcription-tasks/${taskToDelete.id}`);
            if (res.ok) {
                setTasks(prev => {
                    const newTasks = prev.filter(t => t.id !== taskToDelete.id);
                    tasksRef.current = newTasks;
                    return newTasks;
                });
                setTaskToDelete(null);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(taskToDelete.id);
                    return next;
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            const res = await api.post('/transcription-tasks/bulk-delete', {
                task_ids: Array.from(selectedIds)
            });
            if (res.ok) {
                setSelectedIds(new Set());
                // fetchTasks will trigger via state change or manual call
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveRename = async (id, newName) => {
        try {
            const res = await api.put(`/transcription-tasks/${id}/rename`, { filename: newName });
            if (res.ok) {
                setTasks(prev => prev.map(t => t.id === id ? { ...t, filename: newName } : t));
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    const handleRetry = async (id) => {
        try {
            const res = await api.post(`/transcription-tasks/${id}/retry`);
            if (res.ok) {
                setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'PENDING', error_message: null } : t));
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    return {
        toggleSelectOne,
        toggleSelectAll,
        confirmDelete,
        confirmBulkDelete,
        handleSaveRename,
        handleRetry
    };
};
