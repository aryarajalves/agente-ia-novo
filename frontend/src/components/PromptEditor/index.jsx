import React from 'react';
import { PromptProvider, usePrompt } from './PromptContext';
import PromptTextarea from './components/PromptTextarea';
import OutlineSidebar from './components/OutlineSidebar';
import PromptAdvisor from './components/PromptAdvisor';
import ConditionalBuilderModal from './components/ConditionalBuilderModal';
import useConditionalBuilder from './hooks/useConditionalBuilder.jsx';
import { showToast } from '../WebhookManager/utils/helpers';
import './styles/PromptEditor.css';
import './styles/OutlineSidebar.css';
import './styles/ConditionalBuilder.css';

const EditorContent = () => {
    const {
        isExpanded, toggleExpanded, showPlayground,
        saveDraft, isSavingDraft, agentId, promptValue,
        insertTextAtEnd, globalVarsList,
        openCondEdit, setOpenCondEdit,
        replaceTextRange,
        activePromptTab, setActivePromptTab,
    } = usePrompt();

    const [showSaveModal, setShowSaveModal] = React.useState(false);
    const [showCondModal, setShowCondModal] = React.useState(false);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [editingBlock, setEditingBlock] = React.useState(null);
    const [draftName, setDraftName] = React.useState('');
    const [draftDescription, setDraftDescription] = React.useState('');
    const [isCopied, setIsCopied] = React.useState(false);

    // Hook do construtor de condicionais
    const builder = useConditionalBuilder(globalVarsList);

    // Abre modal para NOVA condicional (modo inserção)
    const handleOpenInsertModal = () => {
        builder.resetBuilder();
        setIsEditMode(false);
        setEditingBlock(null);
        setShowCondModal(true);
    };

    // Abre modal pré-preenchido para EDITAR condicional existente
    const handleOpenCondEdit = React.useCallback((block) => {
        builder.populateFromBlock(block);
        setIsEditMode(true);
        setEditingBlock(block);
        setShowCondModal(true);
        setOpenCondEdit(null); // limpa o sinal
    }, [builder, setOpenCondEdit]);

    // Reage ao sinal do contexto emitido pelo overlay do PromptTextarea
    React.useEffect(() => {
        if (openCondEdit) {
            handleOpenCondEdit(openCondEdit);
        }
    }, [openCondEdit, handleOpenCondEdit]);

    // Fecha o modal e reseta estados
    const handleCloseModal = () => {
        setShowCondModal(false);
        setIsEditMode(false);
        setEditingBlock(null);
        builder.resetBuilder();
    };

    // Salva/insere a condicional conforme o modo
    const handleSaveCond = () => {
        const snippet = builder.getGeneratedSnippet();
        if (!snippet) return;

        if (isEditMode && editingBlock) {
            const start = editingBlock.originalBlockStartLine !== undefined ? editingBlock.originalBlockStartLine : editingBlock.blockStartLine;
            const end = editingBlock.originalBlockEndLine !== undefined ? editingBlock.originalBlockEndLine : editingBlock.blockEndLine;
            replaceTextRange(start, end, snippet);
            showToast('✅ Condicional atualizada com sucesso!');
        } else {
            insertTextAtEnd(snippet);
            showToast('✨ Condicional inserida com sucesso!');
        }

        handleCloseModal();
    };

    // Deleta a condicional no modo de edição
    const handleDeleteCond = () => {
        if (isEditMode && editingBlock) {
            const start = editingBlock.originalBlockStartLine !== undefined ? editingBlock.originalBlockStartLine : editingBlock.blockStartLine;
            const end = editingBlock.originalBlockEndLine !== undefined ? editingBlock.originalBlockEndLine : editingBlock.blockEndLine;
            // Substitui o bloco por uma string vazia (remove a condicional e o título/comentário se houver)
            replaceTextRange(start, end, '');
            showToast('🗑️ Condicional removida com sucesso!');
            handleCloseModal();
        }
    };

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(promptValue || '');
            setIsCopied(true);
            showToast('Prompt copiado para a área de transferência!');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('Erro ao copiar o prompt.');
        }
    };

    const handleSaveDraft = async () => {
        const success = await saveDraft(draftName, draftDescription);
        if (success) {
            setShowSaveModal(false);
            setDraftName('');
            setDraftDescription('');
            const versionTab = document.querySelector('[data-tab="versions"]');
            if (versionTab) versionTab.click();
        }
    };

    // Controle de classes do body para fullscreen e modais de forma independente
    React.useEffect(() => {
        if (isExpanded) {
            document.body.classList.add('prompt-fullscreen-active');
        } else {
            document.body.classList.remove('prompt-fullscreen-active');
        }
        
        if (showSaveModal || showCondModal) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        
        return () => {
            document.body.classList.remove('prompt-fullscreen-active');
            document.body.classList.remove('modal-open-blur');
        };
    }, [isExpanded, showSaveModal, showCondModal]);

    return (
        <div className={`prompt-editor-layout ${isExpanded ? 'expanded' : ''}`}>
            <OutlineSidebar />
            <div className="editor-main-area">
                <header className="editor-toolbar">
                    <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="file-icon">📝</span>
                        <span className="file-name">Instruções do Sistema</span>
                        <div className="prompt-tab-selector" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                type="button"
                                onClick={() => setActivePromptTab('static')}
                                style={{
                                    background: activePromptTab === 'static' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activePromptTab === 'static' ? '#a5b4fc' : '#94a3b8',
                                    border: 'none',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: activePromptTab === 'static' ? '600' : 'normal'
                                }}
                            >
                                🔒 Estático (Prompt Cache)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivePromptTab('dynamic')}
                                style={{
                                    background: activePromptTab === 'dynamic' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: activePromptTab === 'dynamic' ? '#a5b4fc' : '#94a3b8',
                                    border: 'none',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: activePromptTab === 'dynamic' ? '600' : 'normal'
                                }}
                            >
                                ⚡ Dinâmico
                            </button>
                        </div>
                    </div>
                    <div className="toolbar-actions">
                        <button
                            id="insert-cond-btn"
                            onClick={handleOpenInsertModal}
                            className="action-btn insert-cond-btn"
                            style={{
                                marginRight: '4px',
                                background: 'rgba(236, 72, 153, 0.1)',
                                color: '#f472b6',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            🔀 Inserir Condicional
                        </button>
                        {agentId && agentId !== 'new' && (
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="action-btn secondary"
                                style={{ marginRight: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                            >
                                💾 Salvar Rascunho
                            </button>
                        )}
                        <button
                            onClick={handleCopyPrompt}
                            className={`action-btn ${isCopied ? 'copied' : 'secondary'}`}
                            style={{ marginRight: '4px' }}
                        >
                            {isCopied ? '✅ Copiado!' : '📋 Copiar Prompt'}
                        </button>
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
                                        onChange={(e) => setDraftName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Descrição (Opcional)</label>
                                    <textarea
                                        placeholder="O que mudou nesta versão?"
                                        value={draftDescription}
                                        onChange={(e) => setDraftDescription(e.target.value)}
                                        style={{ minHeight: '100px' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setShowSaveModal(false)} className="secondary-btn">
                                    Cancelar
                                </button>
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

                {/* Modal do Construtor de Condicionais (inserção ou edição) */}
                <ConditionalBuilderModal
                    show={showCondModal}
                    onClose={handleCloseModal}
                    onSave={handleSaveCond}
                    onDelete={handleDeleteCond}
                    editMode={isEditMode}
                    builder={builder}
                    globalVarsList={globalVarsList}
                />

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
