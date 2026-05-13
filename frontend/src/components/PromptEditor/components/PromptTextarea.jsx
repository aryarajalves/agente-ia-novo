import React, { useRef } from 'react';
import { usePrompt } from '../PromptContext';

const PromptTextarea = () => {
    const { 
        promptValue, onChangePrompt, validVarKeys, textareaRef,
        searchResults, currentResultIdx, setCurrentResultIdx
    } = usePrompt();
    const backdropRef = useRef(null);
    const [indicator, setIndicator] = React.useState(null); // 'up' | 'down' | null

    const syncScroll = (e) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
        }
        checkVisibility();
    };

    const checkVisibility = React.useCallback(() => {
        if (!textareaRef.current || currentResultIdx === -1 || !searchResults[currentResultIdx]) {
            setIndicator(null);
            return;
        }

        const targetLine = searchResults[currentResultIdx].line - 1;
        const lineStyles = window.getComputedStyle(textareaRef.current);
        const lineHeight = parseInt(lineStyles.lineHeight) || 26;
        
        const scrollPos = textareaRef.current.scrollTop;
        const viewportHeight = textareaRef.current.clientHeight;
        const targetPos = targetLine * lineHeight;

        if (targetPos < scrollPos - 20) {
            setIndicator('up');
        } else if (targetPos > scrollPos + viewportHeight - 40) {
            setIndicator('down');
        } else {
            setIndicator(null);
        }
    }, [currentResultIdx, searchResults, textareaRef]);

    React.useEffect(() => {
        checkVisibility();
    }, [currentResultIdx, checkVisibility]);

    const buildHighlightedHtml = (text) => {
        if (!text) return '';
        
        const lines = text.split('\n');
        const currentSearchLine = (currentResultIdx !== -1 && searchResults[currentResultIdx]) 
            ? searchResults[currentResultIdx].line - 1 
            : -1;

        const htmlLines = lines.map((line, idx) => {
            let processed = line
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            processed = processed.replace(/\{([^}]+)\}/g, (match, varName) => {
                const isValid = validVarKeys.includes(varName);
                return `<mark class="${isValid ? 'var-valid' : 'var-unknown'}">{${varName}}</mark>`;
            });

            let headerAttr = '';
            if (line.trim().startsWith('#')) {
                headerAttr = `id="prompt-header-${idx}" class="prompt-header-mark"`;
            }

            const isSearchHighlight = idx === currentSearchLine;
            const lineClass = `editor-line ${isSearchHighlight ? 'search-highlight-active' : ''}`;

            return `<div class="${lineClass}" ${headerAttr}><span class="editor-ln">${idx + 1}</span>${processed || ' '}</div>`;
        });

        return htmlLines.join('');
    };

    const clearSelection = () => {
        setCurrentResultIdx(-1);
    };

    const scrollToTarget = () => {
        if (!textareaRef.current || currentResultIdx === -1 || !searchResults[currentResultIdx]) return;
        const targetLine = searchResults[currentResultIdx].line - 1;
        const lineStyles = window.getComputedStyle(textareaRef.current);
        const lineHeight = parseInt(lineStyles.lineHeight) || 26;
        textareaRef.current.scrollTop = (targetLine * lineHeight) - (textareaRef.current.clientHeight / 2);
    };

    return (
        <div className="prompt-editor-container">
            <div className="editor-relative-container">
                {indicator && (
                    <div className={`selection-indicator ${indicator}`} onClick={scrollToTarget}>
                        <span className="indicator-arrow">{indicator === 'up' ? '▲' : '▼'}</span>
                        <span className="indicator-text">Seleção {indicator === 'up' ? 'acima' : 'abaixo'}</span>
                    </div>
                )}
                
                {currentResultIdx !== -1 && (
                    <button className="clear-selection-btn" onClick={clearSelection} title="Limpar Destaque">
                        ✕
                    </button>
                )}

                <div 
                    ref={backdropRef}
                    className="editor-backdrop"
                    dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(promptValue) }}
                />
                <textarea
                    ref={textareaRef}
                    value={promptValue}
                    onChange={onChangePrompt}
                    onScroll={syncScroll}
                    className="prompt-textarea"
                    placeholder="Escreva as instruções do agente..."
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

export default PromptTextarea;
