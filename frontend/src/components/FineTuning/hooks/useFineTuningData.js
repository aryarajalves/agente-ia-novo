import { useEffect, useCallback } from 'react';
import { useFineTuning } from '../FineTuningContext';
import { api } from '../../../api/client';

export const useFineTuningData = () => {
    const { 
        setAgents, setSelectedAgentId, selectedAgentId, 
        setFeedbackList, setJobs, setLoading,
        filterRating, filterExported, activeTab, jobs
    } = useFineTuning();

    const loadAgents = useCallback(async () => {
        try {
            const res = await api.get('/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
                if (data.length > 0 && !selectedAgentId) setSelectedAgentId(data[0].id);
            }
        } catch (e) { console.error(e); }
    }, [setAgents, setSelectedAgentId, selectedAgentId]);

    const loadFeedback = useCallback(async () => {
        if (!selectedAgentId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ agent_id: selectedAgentId });
            if (filterRating !== 'all') params.set('rating', filterRating);
            if (filterExported === 'pending') params.set('exported', 'false');
            if (filterExported === 'done') params.set('exported', 'true');
            const res = await api.get(`/feedback?${params}`);
            if (res.ok) setFeedbackList(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [selectedAgentId, filterRating, filterExported, setFeedbackList, setLoading]);

    const loadJobs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/fine-tuning/jobs');
            if (res.ok) {
                const data = await res.json();
                setJobs(Array.isArray(data) ? data : []);
            }
        } catch (e) { setJobs([]); }
        finally { setLoading(false); }
    }, [setJobs, setLoading]);

    useEffect(() => { loadAgents(); }, [loadAgents]);
    useEffect(() => { if (activeTab === 'dataset') loadFeedback(); }, [activeTab, loadFeedback]);
    useEffect(() => { if (activeTab === 'jobs') loadJobs(); }, [activeTab, loadJobs]);

    // Polling
    useEffect(() => {
        if (activeTab !== 'jobs') return;
        const hasPending = jobs.some(j => ['validating_files', 'queued', 'running'].includes(j.status));
        if (!hasPending) return;
        const interval = setInterval(loadJobs, 15000);
        return () => clearInterval(interval);
    }, [activeTab, jobs, loadJobs]);

    return { loadFeedback, loadJobs };
};
