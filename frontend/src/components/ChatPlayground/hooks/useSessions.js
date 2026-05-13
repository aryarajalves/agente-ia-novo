import { useState, useCallback } from 'react';
import { api } from '../../../api/client';

export const useSessions = ({ selectedAgentId, sessionId, handleReset, showToast }) => {
    const [sessions, setSessions] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedSessions, setSelectedSessions] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('test'); // 'test' | 'history'
    const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'test'

    const fetchSessions = useCallback(async () => {
        if (!selectedAgentId) return;
        try {
            const res = await api.get(`/sessions?agent_id=${selectedAgentId}`);
            const data = await res.json();
            setSessions(data);
        } catch (err) {
            console.error("Erro ao carregar sessões:", err);
        }
    }, [selectedAgentId]);

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedSessions(new Set());
    };

    const toggleSessionSelection = (sessId) => {
        const newSet = new Set(selectedSessions);
        if (newSet.has(sessId)) {
            newSet.delete(sessId);
        } else {
            newSet.add(sessId);
        }
        setSelectedSessions(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedSessions.size === sessions.length) {
            setSelectedSessions(new Set());
        } else {
            const allIds = new Set(sessions.map(s => s.session_id));
            setSelectedSessions(allIds);
        }
    };

    const executeDelete = async () => {
        if (selectedSessions.size === 0) return;

        try {
            showToast("Excluindo conversas selecionadas...", "info");
            const res = await api.post('/sessions/delete', { session_ids: Array.from(selectedSessions) });

            if (!res.ok) throw new Error("Falha ao deletar");

            // Refresh list
            await fetchSessions();

            // Reset state
            setShowDeleteConfirm(false);
            setIsSelectionMode(false);
            setSelectedSessions(new Set());
            showToast("Conversas excluídas com sucesso!", "success");

            // Clear current chat if deleted
            if (selectedSessions.has(sessionId)) {
                handleReset();
            }

        } catch (e) {
            console.error("Erro ao deletar sessões", e);
            showToast("Erro ao deletar sessões.", "error");
        }
    };

    return {
        sessions,
        setSessions,
        fetchSessions,
        isSelectionMode,
        setIsSelectionMode,
        selectedSessions,
        setSelectedSessions,
        toggleSelectionMode,
        toggleSessionSelection,
        toggleSelectAll,
        executeDelete,
        showDeleteConfirm,
        setShowDeleteConfirm,
        activeTab,
        setActiveTab,
        historyFilter,
        setHistoryFilter
    };
};
