import React from 'react';
import ReactDOM from 'react-dom';

const PromptVersionEditModal = ({ 
    editDraft, 
    editName, 
    setEditName, 
    editDescription, 
    setEditDescription, 
    editText, 
    setEditText, 
    onCancel, 
    onSave, 
    isSavingEdit 
}) => {
    if (!editDraft) return null;

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }} className="fade-in">
            <div className="guide-modal-card" style={{ 
                maxWidth: '850px', 
                width: '100%',
                maxHeight: '90vh',
                background: '#0f172a',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div className="guide-modal-header" style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                        ✏️ Editar Rascunho
                    </h3>
                </div>

                <div className="guide-modal-body" style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Nome da Versão</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Ex: Versão 01"
                            style={{ 
                                width: '100%', padding: '1rem', background: '#020617', 
                                border: '1px solid var(--border-color)', color: 'white', 
                                borderRadius: '12px', fontSize: '0.95rem' 
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Descrição</label>
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="O que mudou nesta versão?"
                            style={{
                                width: '100%', minHeight: '80px', padding: '1rem',
                                background: '#020617', border: '1px solid var(--border-color)',
                                color: 'white', borderRadius: '12px', fontSize: '0.9rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>Texto do Prompt</label>
                        <div style={{ 
                            position: 'relative', 
                            background: '#020617', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: '45px', background: 'rgba(255,255,255,0.02)',
                                borderRight: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', flexDirection: 'column', padding: '1.2rem 0',
                                alignItems: 'center', pointerEvents: 'none', zIndex: 1
                            }}>
                                {editText.split('\n').map((_, i) => (
                                    <div key={i} style={{ 
                                        fontSize: '0.8rem', color: '#6366f1', opacity: 0.4, 
                                        lineHeight: '1.6', height: '1.6em', fontFamily: 'monospace' 
                                    }}>
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                style={{
                                    width: '100%', minHeight: '300px', padding: '1.2rem 1.2rem 1.2rem 3.5rem',
                                    background: 'transparent', border: 'none',
                                    color: 'white', fontFamily: 'monospace',
                                    lineHeight: '1.6', fontSize: '0.9rem', resize: 'vertical',
                                    outline: 'none', position: 'relative', zIndex: 2
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={onCancel}
                            className="secondary-btn"
                            style={{ flex: 1, padding: '1rem', borderRadius: '12px' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            className="create-agent-btn"
                            style={{ 
                                flex: 2, padding: '1rem', borderRadius: '12px',
                                background: 'var(--accent-gradient)', border: 'none',
                                color: 'white', fontWeight: 700
                            }}
                            disabled={isSavingEdit || !editName.trim() || !editText.trim()}
                        >
                            {isSavingEdit ? 'Salvando...' : '💾 Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PromptVersionEditModal;
