import { useEffect, useCallback } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';

export const useTranscriptionData = () => {
    const {
        currentPage, itemsPerPage, selectedFolderId,
        setTasks, setTotalTasks, setFolders, setKnowledgeBases,
        setLoading, setIsRefreshing, tasksRef, activeUploadsRef
    } = useTranscription();

    const fetchTasks = useCallback(async (pageArg, limitArg) => {
        const page = (typeof pageArg === 'number') ? pageArg : currentPage;
        const limit = (typeof limitArg === 'number') ? limitArg : itemsPerPage;

        try {
            setIsRefreshing(true);
            let url = `/transcription-tasks?page=${page}&limit=${limit}&_t=${Date.now()}`;
            if (selectedFolderId) {
                url += `&folder_id=${selectedFolderId}`;
            }
            const res = await api.get(url);
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
                setTotalTasks(data.total || 0);
            }
        } catch (err) {
            console.error("Erro ao buscar histórico:", err);
        } finally {
            setLoading(false);
            setTimeout(() => setIsRefreshing(false), 800);
        }
    }, [currentPage, itemsPerPage, selectedFolderId, setTasks, setTotalTasks, setLoading, setIsRefreshing]);

    const fetchFolders = useCallback(async () => {
        try {
            const res = await api.get('/transcription-folders');
            if (res.ok) {
                const data = await res.json();
                setFolders(data);
            }
        } catch (err) {
            console.error("Erro ao buscar pastas:", err);
        }
    }, [setFolders]);

    const fetchKnowledgeBases = useCallback(async () => {
        try {
            const res = await api.get('/knowledge-bases');
            if (res.ok) {
                const data = await res.json();
                setKnowledgeBases(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Erro ao carregar bases de conhecimento:", err);
        }
    }, [setKnowledgeBases]);

    useEffect(() => {
        fetchFolders();
        fetchKnowledgeBases();
    }, [fetchFolders, fetchKnowledgeBases]);

    useEffect(() => {
        fetchTasks(currentPage, itemsPerPage);
        const interval = setInterval(() => {
            const currentTasks = tasksRef.current;
            const currentUploads = activeUploadsRef.current;
            const hasActiveTasks = currentTasks.some(t => t.status === 'PENDING' || t.status === 'PROCESSING');
            if (hasActiveTasks || currentUploads.length > 0 || currentTasks.length === 0) {
                fetchTasks(currentPage, itemsPerPage);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [currentPage, itemsPerPage, selectedFolderId, fetchTasks, tasksRef, activeUploadsRef]);

    return {
        fetchTasks,
        fetchFolders,
        fetchKnowledgeBases
    };
};
