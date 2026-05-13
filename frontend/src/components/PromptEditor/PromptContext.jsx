import React, { createContext, useContext, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { showToast } from '../WebhookManager/utils/helpers';

const PromptContext = createContext();

export const PromptProvider = ({ children, initialProps }) => {
    const { value, onChange, agentId } = initialProps;

    const [advisorMessages, setAdvisorMessages] = useState([
        { role: 'assistant', content: 'Olá! Sou seu **Consultor de Prompt**. \n\nPosso analisar a estrutura das suas instruções, sugerir melhorias estratégicas ou ajudar você a localizar e atualizar regras específicas. Como posso ajudar?' }
    ]);
    const [advisorInput, setAdvisorInput] = useState('');
    const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
    const [showAdvisorChat, setShowAdvisorChat] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIdx, setCurrentResultIdx] = useState(-1);

    // Playground State
    const [showPlayground, setShowPlayground] = useState(false);
    const [playgroundChat, setPlaygroundChat] = useState([]);

    const [validVarKeys, setValidVarKeys] = useState([]);
    const [activeSection, setActiveSection] = useState(null);

    const textareaRef = React.useRef(null);

    const handleAdvisorMessage = async (message, imageUrl = null) => {
        setIsAdvisorLoading(true);
        const newMessages = [...advisorMessages, { role: 'user', content: message, imageUrl: imageUrl }];
        setAdvisorMessages(newMessages);

        try {
            const response = await api.post('/prompt-chat', {
                agent_id: agentId,
                current_prompt: value,
                messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                image_url: imageUrl
            });
            const data = await response.json();
            setAdvisorMessages([...newMessages, { 
                role: 'assistant', 
                content: data.content,
                model: data.model,
                usage: data.usage
            }]);
        } catch (error) {
            console.error('Advisor Error:', error);
            setAdvisorMessages([...newMessages, { role: 'assistant', content: '❌ Erro ao conectar com o assistente. Verifique se o servidor está online.' }]);
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const handleApplySuggestions = async () => {
        setIsAdvisorLoading(true);
        setIsApplyingSuggestion(true);
        try {
            const response = await api.post('/apply-suggestions', {
                agent_id: agentId,
                current_prompt: value,
                messages: advisorMessages.filter(m => m.role !== 'system')
            });
            const data = await response.json();
            if (data.prompt) {
                onChange({ target: { value: data.prompt } });
                setAdvisorMessages([...advisorMessages, { role: 'assistant', content: '✅ Prompt atualizado com sucesso!' }]);
            }
        } catch (error) {
            console.error('Apply Error:', error);
        } finally {
            setIsAdvisorLoading(false);
            setIsApplyingSuggestion(false);
        }
    };

    const handleAdvisorSearch = async (query) => {
        setIsAdvisorLoading(true);
        try {
            const response = await api.post('/search-prompt', {
                agent_id: agentId,
                system_prompt: value,
                query: query
            });
            const data = await response.json();
            
            if (data.found && data.occurrences.length > 0) {
                const results = data.occurrences.map(occ => ({
                    line: occ.line_start,
                    text: occ.text_snippet,
                    explanation: occ.explanation
                }));
                setSearchResults(results);
                setAdvisorMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `🔍 Encontrei ${results.length} ocorrência(s) sobre "${data.corrected_query || query}":\n\n` + 
                             results.map(r => `• **Linha ${r.line}**: ${r.explanation}`).join('\n')
                }]);
            } else {
                setAdvisorMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `❌ Não encontrei informações específicas sobre "${query}" no prompt atual.` 
                }]);
            }
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const handlePublishPrompt = async () => {
        setIsAdvisorLoading(true);
        try {
            const response = await api.patch(`/agents/${agentId}/publish`, {
                prompt: value
            });
            showToast("Prompt publicado com sucesso!");
            setAdvisorMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `🚀 **Sucesso!**\n\nAs alterações foram publicadas permanentemente no agente. Seu assistente já está utilizando a nova versão.` 
            }]);
        } catch (error) {
            console.error('Publish Error:', error);
            setAdvisorMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao publicar alterações. Tente novamente mais tarde.' }]);
        } finally {
            setIsAdvisorLoading(false);
        }
    };

    const [isSavingDraft, setIsSavingDraft] = useState(false);

    const saveDraft = async (name, description) => {
        if (!agentId || agentId === 'new') return;
        setIsSavingDraft(true);
        try {
            const res = await api.post(`/agents/${agentId}/drafts`, {
                prompt_text: value,
                version_name: name,
                description: description
            });
            if (res.ok) {
                showToast(`Rascunho "${name}" salvo com sucesso!`);
                setAdvisorMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `💾 **Rascunho Salvo!**\n\nA versão "${name}" foi registrada com sucesso e pode ser acessada na aba "Versões".` 
                }]);
                return true;
            }
        } catch (e) {
            console.error("Erro ao salvar rascunho:", e);
            setAdvisorMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao salvar rascunho. Tente novamente.' }]);
        } finally {
            setIsSavingDraft(false);
        }
        return false;
    };

    const promptOutline = useMemo(() => {
        if (!value) return [];
        return value.split('\n')
            .map((line, idx) => ({ line, idx }))
            .filter(item => item.line.trim().startsWith('#'))
            .map(item => ({
                text: item.line.replace(/^#+\s+/, ''),
                level: (item.line.match(/^#+/) || [''])[0].length,
                lineIndex: item.idx
            }));
    }, [value]);

    const toggleExpanded = () => {
        if (textareaRef.current) {
            const { selectionStart, selectionEnd, scrollTop } = textareaRef.current;
            
            // Capture if we have an active section to re-scroll after expansion
            const currentActiveIdx = activeSection;
            
            setIsExpanded(prev => !prev);
            
            // Wait for re-render to complete before restoring state
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    
                    // If we have an active section, prioritize scrolling to it
                    if (currentActiveIdx !== null && promptOutline[currentActiveIdx]) {
                        const item = promptOutline[currentActiveIdx];
                        const lineIndex = item.lineIndex;
                        const lines = value.split('\n');
                        
                        let startPos = 0;
                        for (let i = 0; i < lineIndex; i++) {
                            startPos += lines[i].length + 1;
                        }
                        const endPos = startPos + lines[lineIndex].length;
                        
                        textareaRef.current.setSelectionRange(startPos, endPos);
                        
                        const backdropEl = textareaRef.current.parentNode.querySelector('.editor-backdrop');
                        const headerEl = backdropEl?.querySelector(`#prompt-header-${lineIndex}`);
                        
                        if (headerEl) {
                            textareaRef.current.scrollTop = headerEl.offsetTop - 60;
                        } else {
                            textareaRef.current.scrollTop = (lineIndex * 26) - 60;
                        }
                    } else {
                        // Regular restoration
                        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
                        textareaRef.current.scrollTop = scrollTop;
                    }
                }
            }, 100); // Slightly longer wait for layout stability
        } else {
            setIsExpanded(prev => !prev);
        }
    };

    const handleResetAdvisorMemory = () => {
        setAdvisorMessages([
            { role: 'assistant', content: 'Olá! Sou seu **Consultor de Prompt**. \n\nPosso analisar a estrutura das suas instruções, sugerir melhorias estratégicas ou ajudar você a localizar e atualizar regras específicas. Como posso ajudar?' }
        ]);
        showToast("Memória do assistente reiniciada.");
    };

    const valueContext = {
        textareaRef,
        promptValue: value,
        onChangePrompt: onChange,
        agentId,
        advisorMessages, setAdvisorMessages,
        advisorInput, setAdvisorInput,
        isAdvisorLoading, setIsAdvisorLoading,
        showAdvisorChat, setShowAdvisorChat,
        isExpanded, setIsExpanded,
        toggleExpanded,
        showSearch, setShowSearch,
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        currentResultIdx, setCurrentResultIdx,
        showPlayground, setShowPlayground,
        playgroundChat, setPlaygroundChat,
        validVarKeys, setValidVarKeys,
        activeSection, setActiveSection,
        promptOutline,
        handleAdvisorMessage,
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory,
        isApplyingSuggestion,
        saveDraft,
        isSavingDraft
    };

    return <PromptContext.Provider value={valueContext}>{children}</PromptContext.Provider>;
};

export const usePrompt = () => {
    const context = useContext(PromptContext);
    if (!context) throw new Error('usePrompt must be used within a PromptProvider');
    return context;
};
