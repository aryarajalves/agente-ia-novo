import { useEffect, useCallback } from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';
import { api } from '../../../api/client';

export const usePromptGeneratorData = () => {
    const { setAgents } = usePromptGenerator();

    const fetchAgents = useCallback(async () => {
        try {
            const res = await api.get('/agents');
            if (res.ok) setAgents(await res.json());
        } catch (err) {
            console.error("Erro ao carregar agentes:", err);
        }
    }, [setAgents]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    return { fetchAgents };
};
