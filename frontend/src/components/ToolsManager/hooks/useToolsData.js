import { useEffect, useCallback } from 'react';
import { useTools } from '../ToolsContext';
import { api } from '../../../api/client';

export const useToolsData = () => {
    const { setTools, setGlobalVariables, setAvailableLabels } = useTools();

    const fetchTools = useCallback(async () => {
        try {
            const res = await api.get('/tools');
            if (res.ok) {
                const data = await res.json();
                setTools(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching tools:", err);
        }
    }, [setTools]);

    const fetchGlobalVariables = useCallback(async () => {
        try {
            const res = await api.get('/global-variables');
            if (res.ok) {
                const data = await res.json();
                setGlobalVariables(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Error fetching globals:", e);
        }
    }, [setGlobalVariables]);

    const fetchChatwootLabels = useCallback(async () => {
        try {
            const res = await api.get('/api/chatwoot/labels');
            if (res.ok) {
                const data = await res.json();
                setAvailableLabels(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Error fetching labels:", e);
        }
    }, [setAvailableLabels]);

    useEffect(() => {
        fetchTools();
        fetchGlobalVariables();
    }, [fetchTools, fetchGlobalVariables]);

    return { fetchTools, fetchGlobalVariables, fetchChatwootLabels };
};
