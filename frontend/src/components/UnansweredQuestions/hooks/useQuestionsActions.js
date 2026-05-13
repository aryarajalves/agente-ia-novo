import { useQuestions } from '../QuestionsContext';
import { api } from '../../../api/client';

export const useQuestionsActions = () => {
    const { 
        selectedQuestion, teachMode, selectedKbId, selectedAgentId, 
        answerText, editingQuestionText, setQuestions, setActiveModal, setSaving,
        setSelectedQuestion, setAnswerText, setEditingQuestionText
    } = useQuestions();

    const openModal = (q, type) => {
        setSelectedQuestion(q);
        setActiveModal(type);
        setAnswerText('');
        if (type === 'answer') setEditingQuestionText(q.question);
    };

    const handleAnswerSubmit = async () => {
        if (!answerText.trim() || !selectedQuestion) return;
        setSaving(true);
        try {
            const payload = {
                answer: answerText,
                question: editingQuestionText !== selectedQuestion.question ? editingQuestionText : null
            };
            
            let res;
            if (teachMode === 'rag') {
                res = await api.post(`/unanswered-questions/${selectedQuestion.id}/answer`, {
                    ...payload,
                    knowledge_base_id: parseInt(selectedKbId)
                });
            } else {
                res = await api.post(`/unanswered-questions/${selectedQuestion.id}/answer-to-prompt`, {
                    ...payload,
                    agent_id: parseInt(selectedAgentId)
                });
            }

            const data = await res.json();
            if (data.success) {
                setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
                setActiveModal(null);
            } else {
                alert(data.detail || "Erro ao salvar.");
            }
        } catch (e) {
            alert("Erro de conexão.");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = async () => {
        if (!selectedQuestion) return;
        setSaving(true);
        try {
            const res = await api.post(`/unanswered-questions/${selectedQuestion.id}/discard`);
            if (res.ok) {
                setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
                setActiveModal(null);
            }
        } catch (e) {
            alert("Erro ao descartar.");
        } finally {
            setSaving(false);
        }
    };

    return { openModal, handleAnswerSubmit, handleDiscard };
};
