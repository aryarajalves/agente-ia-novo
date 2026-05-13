import { useEffect, useCallback } from 'react';
import { useQuestions } from '../QuestionsContext';
import { api } from '../../../api/client';

export const useQuestionsData = () => {
    const { 
        setQuestions, setLoading, setKbList, setAgents, 
        setPublicToken, setSelectedKbId, setSelectedAgentId 
    } = useQuestions();

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const [kbRes, uqRes, agentsRes, settingsRes] = await Promise.all([
                api.get('/knowledge-bases'),
                api.get('/unanswered-questions?status=PENDENTE'),
                api.get('/agents'),
                api.get('/settings/public-tokens')
            ]);

            const kbData = await kbRes.json();
            setKbList(kbData);
            if (kbData.length > 0) setSelectedKbId(kbData[0].id);

            const uqData = await uqRes.json();
            if (uqData.success) setQuestions(uqData.items);

            const agentsData = await agentsRes.json();
            setAgents(agentsData);
            if (agentsData.length > 0) setSelectedAgentId(agentsData[0].id);

            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                setPublicToken(settings.PUBLIC_ACCESS_TOKEN_UNANSWERED || '');
            }
        } catch (err) {
            console.error("Erro ao buscar dados do Inbox", err);
        } finally {
            setLoading(false);
        }
    }, [setQuestions, setLoading, setKbList, setAgents, setPublicToken, setSelectedKbId, setSelectedAgentId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    return { fetchQuestions };
};
