import { useState } from 'react';
import { api } from '../../../api/client';

export const useFeedback = ({ selectedAgentId, agents, messages, setMessages, showToast }) => {
    const [feedbackState, setFeedbackState] = useState({}); // { [msgIndex]: 'positive'|'negative'|'correcting'|'done' }
    const [correctionModal, setCorrectionModal] = useState(null); // { msg, userMsg }
    const [correctionText, setCorrectionText] = useState('');
    const [correctionNote, setCorrectionNote] = useState('');
    const [savingFeedback, setSavingFeedback] = useState(false);

    // Helpers de persistência via localStorage
    const fbStorageKey = (agentId, msgContent) => {
        const slug = (msgContent || '').trim().slice(0, 60).replace(/\s+/g, '_');
        return `fb_${agentId}_${slug}`;
    };

    const saveFbToStorage = (agentId, msgContent, state) => {
        try { localStorage.setItem(fbStorageKey(agentId, msgContent), state); } catch { }
    };

    const readFbFromStorage = (agentId, msgContent) => {
        try { return localStorage.getItem(fbStorageKey(agentId, msgContent)); } catch { return null; }
    };

    const sendFeedback = async ({ msg, userMsg, rating, correctedResponse = null, note = null }) => {
        if (!selectedAgentId) return;
        const payload = {
            agent_id: selectedAgentId,
            user_message: userMsg || '(sem contexto)',
            original_response: msg.content,
            rating,
            corrected_response: correctedResponse,
            correction_note: note,
            system_prompt_snapshot: agents.find(a => a.id == selectedAgentId)?.system_prompt || null,
        };
        try {
            await api.post('/feedback', payload);
        } catch (e) {
            console.error('Erro ao salvar feedback:', e);
        }
    };

    const handleThumbsUp = async (msg, msgIndex) => {
        if (feedbackState[msgIndex]) return;
        const userMsg = messages[msgIndex - 1]?.content || '';
        setFeedbackState(prev => ({ ...prev, [msgIndex]: 'positive' }));
        saveFbToStorage(selectedAgentId, msg.content, 'positive');
        await sendFeedback({ msg, userMsg, rating: 'positive' });
    };

    const handleThumbsDown = (msg, msgIndex) => {
        if (feedbackState[msgIndex]) return;
        const userMsg = messages[msgIndex - 1]?.content || '';
        setFeedbackState(prev => ({ ...prev, [msgIndex]: 'correcting' }));
        setCorrectionModal({ msg, userMsg, msgIndex });
        setCorrectionText('');
        setCorrectionNote('');
    };

    const saveCorrection = async () => {
        if (!correctionModal) return;
        if (!correctionText.trim()) return;
        setSavingFeedback(true);
        await sendFeedback({
            msg: correctionModal.msg,
            userMsg: correctionModal.userMsg,
            rating: 'negative',
            correctedResponse: correctionText.trim(),
            note: correctionNote.trim() || null
        });
        saveFbToStorage(selectedAgentId, correctionModal.msg.content, 'negative');
        setFeedbackState(prev => ({ ...prev, [correctionModal.msgIndex]: 'negative' }));
        setCorrectionModal(null);
        setSavingFeedback(false);
    };

    return {
        feedbackState,
        setFeedbackState,
        correctionModal,
        setCorrectionModal,
        correctionText,
        setCorrectionText,
        correctionNote,
        setCorrectionNote,
        savingFeedback,
        handleThumbsUp,
        handleThumbsDown,
        saveCorrection,
        readFbFromStorage
    };
};
