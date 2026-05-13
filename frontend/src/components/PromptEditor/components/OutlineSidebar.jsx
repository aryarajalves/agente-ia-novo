import React, { useMemo } from 'react';
import { usePrompt } from '../PromptContext';

const OutlineSidebar = () => {
    const { promptValue, activeSection, setActiveSection, textareaRef, promptOutline } = usePrompt();

    const scrollToSection = (item, idx) => {
        setActiveSection(idx);
        if (textareaRef.current) {
            // 1. Focus immediately to prevent browser "jump-to-cursor" from overriding our scroll
            textareaRef.current.focus();

            const lines = promptValue.split('\n');
            const lineIndex = item.lineIndex;
            
            // Calculate character positions for selection
            let startPos = 0;
            for (let i = 0; i < lineIndex; i++) {
                startPos += lines[i].length + 1; // +1 for the \n
            }
            const endPos = startPos + lines[lineIndex].length;

            // 2. Perform selection immediately so it's visible even if scroll is smooth
            textareaRef.current.setSelectionRange(startPos, endPos);

            // 3. Find the backdrop container to search for headers
            const backdropEl = textareaRef.current.parentNode.querySelector('.editor-backdrop');
            
            // Wait a tiny bit for the UI to stabilize after focus
            setTimeout(() => {
                const headerEl = backdropEl?.querySelector(`#prompt-header-${lineIndex}`);
                let scrollPos;
                
                if (headerEl) {
                    scrollPos = headerEl.offsetTop - 40; // Slightly more padding
                } else {
                    // Fallback to approximate calculation (approx 26px per line)
                    scrollPos = (lineIndex * 26) - 40;
                }
                
                textareaRef.current.scrollTo({
                    top: Math.max(0, scrollPos),
                    behavior: 'smooth'
                });
            }, 10);
        }
    };

    return (
        <div className="outline-sidebar">
            <div className="sidebar-title">Tópicos do Prompt</div>
            <div className="outline-items">
                {promptOutline.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`outline-item level-${item.level} ${activeSection === idx ? 'active' : ''}`}
                        onClick={() => scrollToSection(item, idx)}
                    >
                        {item.text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OutlineSidebar;
