import { useEffect, useCallback } from 'react';
import { useQuestions } from '../QuestionsContext';
import { api } from '../../../api/client';

export const useQuestionsData = () => {
    const { 
        setQuestions, setLoading, setKbList, setAgents, 
        setPublicToken, setSelectedKbId, setSelectedAgentId,
        limit, page, setTotalCount, setSelectedIds
    } = useQuestions();

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        // Reseta os selecionados na atualização/mudança de página
        setSelectedIds(new Set());
        try {
            const offset = (page - 1) * limit;
            const [kbRes, uqRes, agentsRes, settingsRes] = await Promise.all([
                api.get('/knowledge-bases'),
                api.get(`/unanswered-questions?status=PENDENTE&limit=${limit}&offset=${offset}`),
                api.get('/agents'),
                api.get('/settings/public-tokens')
            ]);

            const kbData = await kbRes.json();
            setKbList(kbData);
            if (kbData.length > 0) setSelectedKbId(kbData[0].id);

            const uqData = await uqRes.json();
            if (uqData.success) {
                setQuestions(uqData.items);
                setTotalCount(uqData.total);
            }

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
    }, [setQuestions, setLoading, setKbList, setAgents, setPublicToken, setSelectedKbId, setSelectedAgentId, limit, page, setTotalCount, setSelectedIds]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    return { fetchQuestions };
};
