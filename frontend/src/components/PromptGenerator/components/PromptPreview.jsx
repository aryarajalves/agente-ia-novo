import React from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';

const PromptPreview = () => {
    const { generatedPrompt, setMaximizedField, isGenerating, setShowPublishModal } = usePromptGenerator();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedPrompt);
        alert('Prompt copiado!');
    };

    return (
        <div className="panel right-panel">
            <h2 className="section-title">2. Resultado (Prompt Mestre)</h2>
            <div className="prompt-preview compact-view">
                {generatedPrompt ? (
                    <div className="compact-scroll-area">
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.5', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {generatedPrompt.length > 200 ? (
                                <>
                                    {generatedPrompt.slice(0, 200)}
                                    <span className="faded-prompt-text">{generatedPrompt.slice(200, 350)}...</span>
                                    <div style={{ marginTop: '1rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                        (Clique em ⤢ para ver tudo)
                                    </div>
                                </>
                            ) : generatedPrompt}
                        </div>
                        <button
                            className="maximize-prompt-btn"
                            onClick={() => setMaximizedField({
                                name: 'generatedPrompt',
                                label: 'Prompt Mestre Completo',
                                value: generatedPrompt,
                                isReadOnly: true
                            })}
                        >⤢</button>
                    </div>
                ) : !isGenerating && (
                    <div className="placeholder-params">O prompt gerado aparecerá aqui...</div>
                )}
            </div>

            {generatedPrompt && !isGenerating && (
                <div className="action-buttons">
                    <button className="copy-btn" onClick={copyToClipboard}>📋 Copiar</button>
                    <button className="publish-btn" onClick={() => setShowPublishModal(true)}>🚀 Aplicar no Agente</button>
                </div>
            )}
        </div>
    );
};

export default PromptPreview;
