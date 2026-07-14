import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { parseConditionalBlocks, collapsePrompt, reconstructPrompt } from './utils/conditionalParser';
import { api } from '../../api/client';
import { showToast } from '../WebhookManager/utils/helpers';

const PromptContext = createContext();

export const PromptProvider = ({ children, initialProps }) => {
    const { value, onChange, dynamicValue, onChangeDynamic, preRouterValue, onChangePreRouter, agentId } = initialProps;
    const [activePromptTab, setActivePromptTab] = useState('static'); // 'static' | 'dynamic' | 'prerouter'
    const [isLoadingPreRouterDefault, setIsLoadingPreRouterDefault] = useState(false);

    const [advisorMessages, setAdvisorMessages] = useState([
        { role: 'assistant', content: 'Olá! Sou seu **Consultor de Prompt**. \n\nPosso analisar a estrutura das suas instruções, sugerir melhorias estratégicas ou ajudar você a localizar e atualizar regras específicas. Como posso ajudar?' }
    ]);
    const [advisorInput, setAdvisorInput] = useState('');
    const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
    const [showAdvisorChat, setShowAdvisorChat] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Carrega variáveis globais dinamicamente no mount
    React.useEffect(() => {
        const loadVars = async () => {
            try {
                const res = await api.get('/global-variables');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setValidVarKeys(data.map(v => v.key));
                        setGlobalVarsList(data);
                    } else if (data && Array.isArray(data.variables)) {
                        // Fallback seguro para suportar mocks legados
                        setValidVarKeys(data.variables.map(v => v.key));
                        setGlobalVarsList(data.variables);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar variáveis para o editor:", error);
            }
        };
        loadVars();
    }, []);

    // Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIdx, setCurrentResultIdx] = useState(-1);

    // Playground State
    const [showPlayground, setShowPlayground] = useState(false);
    const [playgroundChat, setPlaygroundChat] = useState([]);

    const [validVarKeys, setValidVarKeys] = useState([]);
    const [globalVarsList, setGlobalVarsList] = useState([]);
    const [activeSection, setActiveSection] = useState(null);

    // Estado para abrir o modal de edição de condicional a partir da overlay
    const [openCondEdit, setOpenCondEdit] = useState(null); // block | null

    // Blocos condicionais com índices de linha mapeados para a versão colapsada
    const conditionalBlocks = useMemo(() => {
        const originalBlocks = parseConditionalBlocks(value);
        let totalShrunkLines = 0;
        return originalBlocks.map(block => {
            const shrunk = block.blockEndLine - block.ifLineIdx;
            const collapsedIfLineIdx = block.ifLineIdx - totalShrunkLines;
            const collapsedStartLine = block.blockStartLine - totalShrunkLines;
            const collapsedEndLine = collapsedIfLineIdx; // 1 linha no total na visualização colapsada
            
            totalShrunkLines += shrunk;
            
            return {
                ...block,
                originalBlockStartLine: block.blockStartLine,
                originalBlockEndLine: block.blockEndLine,
                originalIfLineIdx: block.ifLineIdx,
                blockStartLine: collapsedStartLine,
                blockEndLine: collapsedEndLine,
                ifLineIdx: collapsedIfLineIdx,
            };
        });
    }, [value]);

    // O valor do prompt exibido no editor (colapsado)
    const promptValue = useMemo(() => {
        return collapsePrompt(value);
    }, [value]);

    // Handler customizado que reconstrói o prompt com blocos completos antes de salvar
    const onChangePrompt = useCallback((e) => {
        const newDisplayedValue = e.target.value;
        const originalBlocks = parseConditionalBlocks(value); // Busca blocos com conteúdo original completo
        const reconstructedFullValue = reconstructPrompt(newDisplayedValue, originalBlocks);
        onChange({ target: { value: reconstructedFullValue } });
    }, [onChange, value]);

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

    // Busca o template padrão do Pre-Router no backend e preenche o campo customizado.
    // Usado pelo botão "Restaurar Padrão" na aba Pre-Router, e também automaticamente
    // (silent=true) quando o agente ainda não tem um pre_router_prompt salvo, para que
    // a aba mostre o conteúdo que já está rodando de verdade em vez de aparecer vazia.
    const loadPreRouterDefaultTemplate = async (silent = false) => {
        if (!onChangePreRouter) return;
        setIsLoadingPreRouterDefault(true);
        try {
            const res = await api.get('/agents/pre-router-default-prompt');
            if (res.ok) {
                const data = await res.json();
                onChangePreRouter({ target: { value: data.prompt || '' } });
                if (!silent) {
                    showToast('Prompt padrão do Pre-Router carregado. Lembre-se de salvar para aplicar.');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar template padrão do Pre-Router:', error);
            if (!silent) {
                showToast('❌ Erro ao carregar o template padrão do Pre-Router.');
            }
        } finally {
            setIsLoadingPreRouterDefault(false);
        }
    };

    // Referência para não repetir o auto-load silencioso mais de uma vez por sessão do editor
    const hasAutoLoadedPreRouterDefault = React.useRef(false);

    // Quando o usuário abre a aba Pre-Router e o agente ainda não tem um prompt
    // customizado salvo (preRouterValue vazio), popula automaticamente com o template
    // padrão que já está em uso de verdade — em vez de deixar a caixa vazia parecendo
    // que "sumiu" o conteúdo que já existia.
    React.useEffect(() => {
        if (
            activePromptTab === 'prerouter' &&
            !preRouterValue &&
            !hasAutoLoadedPreRouterDefault.current &&
            onChangePreRouter
        ) {
            hasAutoLoadedPreRouterDefault.current = true;
            loadPreRouterDefaultTemplate(true);
        }
    }, [activePromptTab, preRouterValue, onChangePreRouter]);

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

    const insertTextAtCursor = (textToInsert) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = promptValue || '';
        
        const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
        const originalBlocks = parseConditionalBlocks(value);
        const reconstructedFullValue = reconstructPrompt(newValue, originalBlocks);
        
        // Atualiza o estado
        onChange({ target: { value: reconstructedFullValue } });
        
        // Aguarda a renderização e restaura o cursor/foco
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + textToInsert.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Força a sincronização do scroll do backdrop
            const event = { target: textarea };
            if (textarea.onScroll) {
                textarea.onScroll(event);
            }
        }, 50);
    };

    const insertTextAtEnd = (textToInsert) => {
        const currentValue = promptValue || '';
        const newValue = currentValue ? `${currentValue}\n\n${textToInsert}` : textToInsert;
        const originalBlocks = parseConditionalBlocks(value);
        const reconstructedFullValue = reconstructPrompt(newValue, originalBlocks);

        onChange({ target: { value: reconstructedFullValue } });

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const len = collapsePrompt(reconstructedFullValue).length;
                textareaRef.current.setSelectionRange(len, len);
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }, 50);
    };

    /**
     * Substitui o conteúdo entre startLine e endLine (inclusive, 0-indexed) pelo newText.
     * Usado para atualizar um bloco condicional existente após edição.
     */
    const replaceTextRange = useCallback((startLine, endLine, newText) => {
        const lines = (value || '').split('\n');
        const before = lines.slice(0, startLine);
        const after = lines.slice(endLine + 1);
        const newLines = [...before, ...newText.split('\n'), ...after];
        const newValue = newLines.join('\n');
        onChange({ target: { value: newValue } });

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // Posiciona o cursor no início do bloco substituído
                let cursorPos = 0;
                for (let i = 0; i < startLine; i++) {
                    cursorPos += newLines[i].length + 1;
                }
                textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            }
        }, 50);
    }, [value, onChange]);

    const activePromptValue = activePromptTab === 'static'
        ? promptValue
        : activePromptTab === 'dynamic'
            ? (dynamicValue || '')
            : (preRouterValue || '');

    const activeOnChangePrompt = activePromptTab === 'static'
        ? onChangePrompt
        : activePromptTab === 'dynamic'
            ? onChangeDynamic
            : onChangePreRouter;

    const valueContext = {
        textareaRef,
        promptValue: activePromptValue,
        onChangePrompt: activeOnChangePrompt,
        activePromptTab,
        setActivePromptTab,
        loadPreRouterDefaultTemplate,
        isLoadingPreRouterDefault,
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
        globalVarsList, setGlobalVarsList,
        activeSection, setActiveSection,
        promptOutline,
        conditionalBlocks,
        openCondEdit, setOpenCondEdit,
        handleAdvisorMessage,
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory,
        isApplyingSuggestion,
        saveDraft,
        isSavingDraft,
        insertTextAtCursor,
        insertTextAtEnd,
        replaceTextRange,
    };

    return <PromptContext.Provider value={valueContext}>{children}</PromptContext.Provider>;
};

export const usePrompt = () => {
    const context = useContext(PromptContext);
    if (!context) throw new Error('usePrompt must be used within a PromptProvider');
    return context;
};
