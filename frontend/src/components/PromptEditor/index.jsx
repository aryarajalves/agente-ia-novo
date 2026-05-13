import React from 'react';
import { PromptProvider, usePrompt } from './PromptContext';
import PromptTextarea from './components/PromptTextarea';
import OutlineSidebar from './components/OutlineSidebar';
import PromptAdvisor from './components/PromptAdvisor';
import './styles/PromptEditor.css';

const EditorContent = () => {
    const { isExpanded, toggleExpanded, showPlayground, saveDraft, isSavingDraft, agentId } = usePrompt();
    const [showSaveModal, setShowSaveModal] = React.useState(false);
    const [draftName, setDraftName] = React.useState('');
    const [draftDescription, setDraftDescription] = React.useState('');

    const handleSaveDraft = async () => {
        const success = await saveDraft(draftName, draftDescription);
        if (success) {
            setShowSaveModal(false);
            setDraftName('');
            setDraftDescription('');
            // Redireciona para a aba de versões
            const versionTab = document.querySelector('[data-tab="versions"]');
            if (versionTab) versionTab.click();
        }
    };

    // Side effect to handle body overflow and sidebar hiding when expanded OR modal open
    React.useEffect(() => {
        if (isExpanded || showSaveModal) {
            document.body.classList.add('prompt-fullscreen-active');
            if (showSaveModal) document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('prompt-fullscreen-active');
            document.body.classList.remove('modal-open-blur');
        }
        return () => {
            document.body.classList.remove('prompt-fullscreen-active');
            document.body.classList.remove('modal-open-blur');
        };
    }, [isExpanded, showSaveModal]);

    return (
        <div className={`prompt-editor-layout ${isExpanded ? 'expanded' : ''}`}>
            <OutlineSidebar />
            <div className="editor-main-area">
                <header className="editor-toolbar">
                    <div className="toolbar-left">
                        <span className="file-icon">📝</span>
                        <span className="file-name">Instruções do Sistema</span>
                    </div>
                    <div className="toolbar-actions">
                        {agentId && agentId !== 'new' && (
                            <button onClick={() => setShowSaveModal(true)} className="action-btn secondary" style={{ marginRight: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                💾 Salvar Rascunho
                            </button>
                        )}
                        <button onClick={toggleExpanded} className="action-btn primary">
                            {isExpanded ? '✖ Sair da Tela Cheia' : '🔲 Tela Cheia'}
                        </button>
                    </div>
                </header>
                
                {/* Modal de Salvamento de Rascunho */}
                {showSaveModal && (
                    <div className="draft-modal-overlay fade-in">
                        <div className="draft-modal-card">
                            <div className="modal-header">
                                <h3>💾 Criar Versão de Rascunho</h3>
                                <button onClick={() => setShowSaveModal(false)} className="close-x">×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1.5rem' }}>
                                    Salve o estado atual do prompt para restaurá-lo futuramente se precisar.
                                </p>
                                <div className="form-group">
                                    <label>Nome da Versão</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Versão com regras de preço" 
                                        value={draftName}
                                        onChange={e => setDraftName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Descrição (Opcional)</label>
                                    <textarea 
                                        placeholder="O que mudou nesta versão?" 
                                        value={draftDescription}
                                        onChange={e => setDraftDescription(e.target.value)}
                                        style={{ minHeight: '100px' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setShowSaveModal(false)} className="secondary-btn">Cancelar</button>
                                <button 
                                    onClick={handleSaveDraft} 
                                    className="primary-btn"
                                    disabled={!draftName.trim() || isSavingDraft}
                                >
                                    {isSavingDraft ? 'Salvando...' : 'Criar Versão'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="editor-content-split">
                    <PromptTextarea />
                    {showPlayground && <div className="playground-panel">Playground Content...</div>}
                </div>
            </div>
            <PromptAdvisor />
        </div>
    );
};

const PromptEditor = (props) => (
    <PromptProvider initialProps={props}>
        <EditorContent />
    </PromptProvider>
);

export default PromptEditor;
