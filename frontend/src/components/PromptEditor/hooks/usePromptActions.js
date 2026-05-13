import { useCallback } from 'react';
import { usePrompt } from '../PromptContext';
import { api } from '../../../api/client';

export const usePromptActions = () => {
    const { 
        promptValue, onChangePrompt, agentId,
        setAdvisorMessages, setIsAdvisorLoading, setAdvisorInput
    } = usePrompt();

    const refinePrompt = useCallback(async (instructions) => {
        setIsAdvisorLoading(true);
        try {
            const response = await api.post('/api/prompt/refine', {
                prompt_content: promptValue,
                user_instructions: instructions
            });
            const data = await response.json();
            if (data.new_prompt) {
                onChangePrompt({ target: { value: data.new_prompt } });
                setAdvisorMessages(prev => [...prev, { role: 'assistant', content: `✨ **Prompt Refinado!**\n\n${data.summary}` }]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAdvisorLoading(false);
        }
    }, [promptValue, onChangePrompt, setAdvisorMessages, setIsAdvisorLoading]);

    const sendAdvisorMessage = useCallback(async (input) => {
        if (!input.trim()) return;
        setAdvisorMessages(prev => [...prev, { role: 'user', content: input }]);
        setIsAdvisorLoading(true);
        setAdvisorInput('');
        try {
            const response = await api.post('/api/prompt/advisor', {
                prompt_content: promptValue,
                user_query: input
            });
            const data = await response.json();
            if (data.content) {
                setAdvisorMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAdvisorLoading(false);
        }
    }, [promptValue, setAdvisorMessages, setIsAdvisorLoading, setAdvisorInput]);

    return { refinePrompt, sendAdvisorMessage };
};
