import { usePromptGenerator } from '../PromptGeneratorContext';
import { api } from '../../../api/client';

export const usePromptGeneratorActions = () => {
    const { 
        formData, setGeneratedPrompt, setIsGenerating, 
        chatMessages, setChatMessages, setChatInput, setIsTalkingToAI,
        selectedAgentId, setShowPublishModal, setIsPublishing, generatedPrompt, chatInput
    } = usePromptGenerator();

    const handleGenerate = async () => {
        if (!formData.identity.trim() || !formData.mission.trim()) {
            alert('Por favor, preencha pelo menos a Identidade e a Missão do agente.');
            return;
        }
        setIsGenerating(true);
        setGeneratedPrompt('');
        try {
            const response = await api.post('/generate-prompt', formData);
            if (!response.ok) throw new Error('Falha ao gerar prompt');
            const data = await response.json();
            setGeneratedPrompt(data.prompt);
        } catch (error) {
            alert(`Erro ao gerar prompt: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim()) return;
        const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
        setChatMessages(newMessages);
        setChatInput('');
        setIsTalkingToAI(true);
        try {
            const response = await api.post('/prompt-chat', {
                current_prompt: generatedPrompt,
                messages: newMessages
            });
            if (!response.ok) throw new Error('Falha ao conversar com IA');
            const data = await response.json();
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        } catch (error) {
            alert('Erro no chat: ' + error.message);
        } finally {
            setIsTalkingToAI(false);
        }
    };

    const handleApplySuggestions = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/apply-suggestions', {
                current_prompt: generatedPrompt,
                messages: chatMessages
            });
            if (!response.ok) throw new Error('Falha ao aplicar melhorias');
            const data = await response.json();
            setGeneratedPrompt(data.prompt);
            setChatMessages([]);
            alert('Prompt melhorado com sucesso! ✨');
        } catch (error) {
            alert('Erro ao aplicar melhorias: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublishToAgent = async () => {
        if (!selectedAgentId) return;
        setIsPublishing(true);
        try {
            const response = await api.patch(`/agents/${selectedAgentId}/publish`, { prompt: generatedPrompt });
            if (!response.ok) throw new Error('Falha ao publicar prompt');
            const data = await response.json();
            alert(data.message);
            setShowPublishModal(false);
        } catch (error) {
            alert('Erro ao publicar: ' + error.message);
        } finally {
            setIsPublishing(false);
        }
    };

    return { handleGenerate, handleSendChatMessage, handleApplySuggestions, handlePublishToAgent };
};
