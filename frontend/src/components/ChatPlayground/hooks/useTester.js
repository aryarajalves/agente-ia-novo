import { useState, useRef, useCallback } from 'react';
import { api } from '../../../api/client';
import { getTesterPersonas } from '../utils/constants';

export const useTester = ({
    selectedAgentId,
    agents,
    sessionId,
    messagesRef,
    handleSendMessage,
    showToast,
    testerSentiment, setTesterSentiment,
    testerReport, setTesterReport,
    hasTesterReport, setHasTesterReport
}) => {
    const [isTesterMode, setIsTesterMode] = useState(false);
    const [testerPersona, setTesterPersona] = useState('cético');
    const [isTesterRunning, setIsTesterRunning] = useState(false);
    const [testerMessageCount, setTesterMessageCount] = useState(3);
    const [testerDelay, setTesterDelay] = useState(2);
    const [testerKnowsPrompt, setTesterKnowsPrompt] = useState(false);
    const [testerIsDynamic, setTesterIsDynamic] = useState(false);
    const [customPersona, setCustomPersona] = useState('');
    const [isTesterAutoRunning, setIsTesterAutoRunning] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    
    const autoTesterActiveRef = useRef(false);

    const runTesterSingleTurn = async () => {
        if (!selectedAgentId) return;
        setIsTesterRunning(true);
        try {
            const personas = getTesterPersonas(customPersona);
            const currentHistory = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
            const agentPrompt = testerKnowsPrompt ? agents.find(a => a.id == selectedAgentId)?.system_prompt : null;
            const personaPrompt = testerPersona === 'custom' ? customPersona : personas[testerPersona].prompt;

            const testerRes = await api.post('/tester/provoke', {
                persona_prompt: personaPrompt,
                history: currentHistory,
                agent_id: selectedAgentId,
                session_id: sessionId,
                agent_prompt: agentPrompt || null,
                is_dynamic: testerIsDynamic
            });

            if (!testerRes.ok) throw new Error("Erro ao gerar provocação no backend");
            const testerData = await testerRes.json();
            const provocation = testerData.provocation;
            if (testerData.sentiment !== undefined) setTesterSentiment(testerData.sentiment);

            await handleSendMessage(null, provocation);
        } catch (e) {
            console.error(e);
            showToast("Erro ao rodar turno do tester.", "error");
        } finally {
            setIsTesterRunning(false);
        }
    };

    const generateTestReport = async () => {
        if (messagesRef.current.length < 2) return;
        setIsGeneratingReport(true);
        try {
            const personas = getTesterPersonas(customPersona);
            const personaPrompt = testerPersona === 'custom' ? customPersona : personas[testerPersona].prompt;
            const res = await api.post('/tester/evaluate', {
                session_id: sessionId,
                agent_id: selectedAgentId,
                persona_prompt: personaPrompt,
                history: messagesRef.current.map(m => ({ role: m.role, content: m.content })),
                agent_prompt: agents.find(a => a.id == selectedAgentId)?.system_prompt
            });
            const data = await res.json();
            setTesterReport(data);
            setHasTesterReport(true);
        } catch (e) {
            console.error(e);
            showToast("Erro ao gerar relatório.", "error");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const fetchTestReport = async () => {
        if (!sessionId) return;
        setIsGeneratingReport(true);
        try {
            const res = await api.get(`/sessions/${sessionId}/test-report`);
            const data = await res.json();
            if (data && !data.error) {
                setTesterReport(data);
                setHasTesterReport(true);
            } else {
                showToast("Nenhum relatório salvo.", "info");
            }
        } catch (e) {
            console.error(e);
            showToast("Erro ao carregar relatório.", "error");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const toggleAutoTester = async () => {
        if (isTesterAutoRunning) {
            autoTesterActiveRef.current = false;
            setIsTesterAutoRunning(false);
            return;
        }

        setTesterReport(null);
        setTesterSentiment(50);
        setIsTesterAutoRunning(true);
        autoTesterActiveRef.current = true;

        let turns = 0;
        while (autoTesterActiveRef.current && turns < testerMessageCount) {
            await runTesterSingleTurn();
            turns++;

            if (turns < testerMessageCount && autoTesterActiveRef.current) {
                await new Promise(r => setTimeout(r, testerDelay * 1000));
            }
        }

        setIsTesterAutoRunning(false);
        autoTesterActiveRef.current = false;

        if (messagesRef.current.length >= 2) {
            await generateTestReport();
        }
    };

    return {
        isTesterMode, setIsTesterMode,
        testerPersona, setTesterPersona,
        isTesterRunning,
        testerMessageCount, setTesterMessageCount,
        testerDelay, setTesterDelay,
        testerKnowsPrompt, setTesterKnowsPrompt,
        testerIsDynamic, setTesterIsDynamic,
        testerSentiment, setTesterSentiment,
        customPersona, setCustomPersona,
        testerReport, setTesterReport,
        isTesterAutoRunning,
        isGeneratingReport,
        hasTesterReport, setHasTesterReport,
        toggleAutoTester,
        fetchTestReport,
        generateTestReport
    };
};
