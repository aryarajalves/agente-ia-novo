import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';
import PromptVersionEditModal from './PromptVersionEditModal';
import { showToast, formatDate } from './WebhookManager/utils/helpers';

const PromptVersions = ({ agentId, onRestore }) => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [restoreData, setRestoreData] = useState(null);
    const [viewId, setViewId] = useState(null);
    const [editDraft, setEditDraft] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editText, setEditText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const fetchDrafts = async () => {
        if (!agentId || agentId === 'new') {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get(`/agents/${agentId}/drafts`);
            const data = await res.json();
            setDrafts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Erro ao buscar rascunhos:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, [agentId]);

    // Handle body blur when modal is open
    useEffect(() => {
        if (editDraft || deleteId || restoreData) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [editDraft, deleteId, restoreData]);

    const handleDelete = async () => {
        try {
            const res = await api.delete(`/drafts/${deleteId}`);
            if (res.ok) {
                showToast("Versão excluída com sucesso");
                fetchDrafts();
            }
        } catch (e) {
            console.error("Erro ao excluir rascunho:", e);
            showToast("Erro ao excluir versão", "error");
        } finally {
            setDeleteId(null);
        }
    };

    const confirmRestore = () => {
        try {
            onRestore(restoreData.prompt_text);
            showToast(`Versão "${restoreData.version_name}" restaurada no editor`);
            setRestoreData(null);
        } catch (e) {
            showToast("Erro ao restaurar versão", "error");
        }
    };

    const handleEditStart = (draft) => {
        setEditDraft(draft);
        setEditName(draft.version_name);
        setEditDescription(draft.description || '');
        setEditText(draft.prompt_text);
    };

    const handleEditSave = async () => {
        if (!editName.trim() || !editText.trim()) return;
        setIsSavingEdit(true);
        try {
            const res = await api.put(`/drafts/${editDraft.id}`, {
                version_name: editName,
                description: editDescription,
                prompt_text: editText,
                agent_id: agentId // Required by model even if not changed
            });
            if (res.ok) {
                showToast("Versão atualizada com sucesso");
                setEditDraft(null);
                fetchDrafts();
            }
        } catch (e) {
            console.error("Erro ao editar rascunho:", e);
            showToast("Erro ao salvar alterações", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    if (!agentId || agentId === 'new') {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Salve o agente primeiro para habilitar o controle de versões de prompt.</p>
            </div>
        );
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Carregando versões...</div>;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-label">Histórico de Versões do Prompt</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{drafts.length} versões salvas</span>
            </div>

            {drafts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Nenhuma versão salva ainda. No editor de prompt, clique em "Salvar Rascunho" para criar um ponto de restauração.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {drafts.map(d => (
                        <div key={d.id} className="draft-wrapper">
                            <div className={`draft-card ${viewId === d.id ? 'active' : ''}`} style={{
                                background: 'rgba(15, 23, 42, 0.4)',
                                border: '1px solid var(--border-color)',
                                padding: '1.2rem 1.5rem',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                position: 'relative',
                                zIndex: 2
                            }} onClick={() => setViewId(viewId === d.id ? null : d.id)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                        {viewId === d.id ? '📖' : '📜'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: '2px' }}>{d.version_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🕒 {formatDate(d.created_at)}</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{d.token_count || Math.ceil((d.prompt_text?.length || 0) / 4)} tokens</span>
                                        </div>
                                        {d.description && (
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleEditStart(d)}
                                        className="secondary-btn edit-trigger"
                                        style={{
                                            padding: '0.6rem 1rem',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            borderRadius: '10px'
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => setRestoreData(d)}
                                        className="secondary-btn restore-trigger"
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            borderRadius: '10px'
                                        }}
                                    >
                                        🔄 Restaurar
                                    </button>
                                    <button
                                        onClick={() => setDeleteId(d.id)}
                                        className="delete-trigger"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.1)',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                    <div style={{ marginLeft: '10px', opacity: 0.3, transform: viewId === d.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Expandido */}
                            {viewId === d.id && (
                                <div className="draft-content-preview fade-in" style={{
                                    background: 'rgba(2, 6, 23, 0.4)',
                                    margin: '-10px 10px 0 10px',
                                    padding: '2rem 1.5rem 1.5rem 1.5rem',
                                    borderRadius: '0 0 16px 16px',
                                    border: '1px solid var(--border-color)',
                                    borderTop: 'none',
                                    fontSize: '0.9rem',
                                    color: '#cbd5e1',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {d.prompt_text.split('\n').map((line, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.02)', padding: '2px 0' }}>
                                                <span style={{ 
                                                    minWidth: '35px', 
                                                    textAlign: 'right', 
                                                    color: '#6366f1', 
                                                    opacity: 0.5, 
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.8rem',
                                                    userSelect: 'none'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ flex: 1 }}>{line || ' '}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Confirmação de Restauração */}
            <ConfirmModal
                isOpen={!!restoreData}
                title="Confirmar Restauração"
                message={`Você deseja substituir o prompt atual pelo rascunho "${restoreData?.version_name}"?`}
                onConfirm={confirmRestore}
                onCancel={() => setRestoreData(null)}
                confirmText="🔄 Sim, Restaurar"
                type="info"
            />

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={!!deleteId}
                title="Excluir Versão"
                message="Esta ação é permanente e não pode ser desfeita. Excluir este rascunho?"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
                confirmText="Excluir Permanentemente"
                type="danger"
            />

            {/* Modal de Edição de Rascunho */}
            <PromptVersionEditModal 
                editDraft={editDraft}
                editName={editName}
                setEditName={setEditName}
                editDescription={editDescription}
                setEditDescription={setEditDescription}
                editText={editText}
                setEditText={setEditText}
                onCancel={() => setEditDraft(null)}
                onSave={handleEditSave}
                isSavingEdit={isSavingEdit}
            />

            <style>{`
                .draft-wrapper {
                    position: relative;
                }
                .draft-card:hover {
                    border-color: rgba(99, 102, 241, 0.4) !important;
                    background: rgba(15, 23, 42, 0.6) !important;
                    transform: translateY(-2px);
                }
                .draft-card.active {
                    border-color: var(--accent-color) !important;
                    background: rgba(99, 102, 241, 0.05) !important;
                    border-bottom-left-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                }
                .restore-trigger:hover {
                    background: rgba(16, 185, 129, 0.2) !important;
                    transform: scale(1.05);
                }
                .edit-trigger:hover {
                    background: rgba(59, 130, 246, 0.2) !important;
                    transform: scale(1.05);
                }
                .delete-trigger:hover {
                    background: rgba(239, 68, 68, 0.2) !important;
                    color: #f87171 !important;
                }
                .draft-content-preview {
                    scrollbar-width: thin;
                    scrollbar-color: var(--accent-color) transparent;
                }
            `}</style>
        </div>
    );
};

export default PromptVersions;
