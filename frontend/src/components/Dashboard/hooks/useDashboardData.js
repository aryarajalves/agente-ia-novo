import { useEffect, useCallback } from 'react';
import { useDashboard } from '../DashboardContext';
import { api } from '../../../api/client';

export const useDashboardData = () => {
    const { 
        setAgents, setFilteredAgents, setKbList, setStats, 
        setLoading, setError, searchTerm, modelFilter, agents 
    } = useDashboard();

    const refreshStats = useCallback(async () => {
        try {
            const res = await api.get('/dashboard/stats');
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error("Stats fetch error", e); }
    }, [setStats]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [resAgents, resKBs] = await Promise.all([
                api.get('/agents'),
                api.get('/knowledge-bases')
            ]);
            if (!resAgents.ok || !resKBs.ok) throw new Error("Erro ao conectar ao servidor.");
            
            const agentsData = await resAgents.json();
            setAgents(agentsData);
            setFilteredAgents(agentsData);
            setKbList(await resKBs.json() || []);
            refreshStats();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [setAgents, setFilteredAgents, setKbList, setLoading, setError, refreshStats]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let result = agents;
        if (searchTerm) result = result.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (modelFilter) result = result.filter(a => (a.router_enabled ? a.router_complex_model : a.model) === modelFilter);
        setFilteredAgents(result);
    }, [searchTerm, modelFilter, agents, setFilteredAgents]);

    return { fetchData, refreshStats };
};
