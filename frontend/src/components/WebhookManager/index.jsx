import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client';

// Styles
import './styles/WebhookManager.css';

// Hooks
import { useWebhooks } from './hooks/useWebhooks';
import { useEvents } from './hooks/useEvents';
import { useWebhookOperations } from './hooks/useWebhookOperations';
import { useLeads } from './hooks/useLeads';

// Components
import WebhookList from './components/WebhookList';
import BulkActionToolbar from './components/BulkActionToolbar';
import HistoryModal from './components/HistoryModal/index';
import LeadsModal from './components/LeadsModal';
import EditWebhookModal from './components/EditWebhookModal';
import LeadHistoryModal from './components/LeadHistoryModal';

// Utils & Constants
import { showToast, getReceiveUrl } from './utils/helpers';

const WebhookManager = () => {
    // Estado Local
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [selectedWebhooks, setSelectedWebhooks] = useState(new Set());
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, webhookId: null, webhookName: '', isBulk: false });
    const [confirmLeadDelete, setConfirmLeadDelete] = useState({ isOpen: false, lead: null, isBulk: false });
    const [isDeletingLead, setIsDeletingLead] = useState(false);
    const [confirmEventDelete, setConfirmEventDelete] = useState({ isOpen: false, event: null, isBulk: false });
    const [confirmRemoveFU, setConfirmRemoveFU] = useState(null);
    const [copiedToken, setCopiedToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [leadHistoryModal, setLeadHistoryModal] = useState(null);

    // Hooks de Dados e Operações
    const { 
        webhooks, 
        loading: webhooksLoading, 
        fetchWebhooks, 
        agents, 
        chatwootGlobal,
        chatwootLabels,
        labelsLoading,
        handleGenerateDescription
    } = useWebhooks(showToast);

    const {
        selectedWebhook, setSelectedWebhook,
        events,
        eventsLoading,
        historyFilters, setHistoryFilters,
        historyTotal, historyPage, setHistoryPage,
        historyLimit, setHistoryLimit,
        historyTab, setHistoryTab,
        fetchEvents, clearHistoryFilters,
        selectedEvents, setSelectedEvents
    } = useEvents();

    const {
        isCreating, setIsCreating,
        createForm, setCreateForm,
        createSaving, createError,
        handleCreate,
        editingWebhook, setEditingWebhook,
        editForm, setEditForm,
        editSaving, editError,
        editTab, setEditTab,
        handleEdit,
        handleOpenEdit,
        handleOpenCreate,
        togglingId,
        handleToggleActive,
        editAllowedInput, setEditAllowedInput,
        editBlockedInput, setEditBlockedInput,
        editDeleteInput, setEditDeleteInput
    } = useWebhookOperations(fetchWebhooks, setSelectedWebhook);

    const {
        leadsModal, setLeadsModal,
        fetchLeads,
        selectedLeads,
        setSelectedLeads,
        toggleSelectLead,
        toggleSelectAllLeads,
        handleSyncAll,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads,
        deletingLeads
    } = useLeads();

    // Efeito para capturar toasts globais do WebhookManager
    useEffect(() => {
        const handleToast = (e) => {
            const { message, type } = e.detail;
            setToast({ show: true, message, type: type || 'success' });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
        };
        window.addEventListener('app:toast', handleToast);
        return () => window.removeEventListener('app:toast', handleToast);
    }, []);

    // Bloquear scroll do body quando qualquer modal estiver aberto
    useEffect(() => {
        const isAnyModalOpen = isCreating || confirmModal.isOpen || !!confirmRemoveFU || !!leadsModal || !!selectedWebhook || !!editingWebhook || !!leadHistoryModal || confirmLeadDelete.isOpen || confirmEventDelete.isOpen;
        
        if (isAnyModalOpen) {
            document.body.classList.add('global-modal-open');
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => { 
                document.body.classList.remove('global-modal-open');
                document.body.style.overflow = originalStyle; 
            };
        } else {
            document.body.classList.remove('global-modal-open');
        }
    }, [isCreating, confirmModal.isOpen, confirmRemoveFU, leadsModal, selectedWebhook, editingWebhook, leadHistoryModal, confirmLeadDelete.isOpen, confirmEventDelete.isOpen]);

    // Helpers
    const copyToClipboard = (token, id) => {
        const url = getReceiveUrl(token);
        navigator.clipboard.writeText(url);
        setCopiedToken(id || token);
        showToast('URL copiada para a área de transferência!');
        setTimeout(() => setCopiedToken(null), 2000);
    };


    const handleDeleteWebhook = async () => {
        if (!confirmModal.webhookId && !confirmModal.isBulk) return;
        
        try {
            if (confirmModal.isBulk) {
                const ids = Array.from(selectedWebhooks);
                let successCount = 0;
                for (const id of ids) {
                    const res = await api.delete(`/webhooks/${id}`);
                    if (res.ok) successCount++;
                }
                setSelectedWebhooks(new Set());
                showToast(`${successCount} integrações removidas!`);
            } else {
                const res = await api.delete(`/webhooks/${confirmModal.webhookId}`);
                if (res.ok) {
                    showToast('Integração removida com sucesso!');
                } else {
                    showToast('Erro ao remover integração.', 'error');
                }
            }
            setConfirmModal({ isOpen: false, webhookId: null, webhookName: '', isBulk: false });
            await fetchWebhooks();
        } catch (e) {
            showToast('Erro de conexão ao remover integração(ões).', 'error');
        }
    };

    const removeFollowupStep = (index, modalType = 'create') => {
        if (modalType === 'create') {
            const s = [...createForm.followup_steps];
            s.splice(index, 1);
            setCreateForm({ ...createForm, followup_steps: s });
        } else {
            const s = [...editForm.followup_steps];
            s.splice(index, 1);
            setEditForm({ ...editForm, followup_steps: s });
        }
        setConfirmRemoveFU(null);
    };

    return (
        <>
            <div className="webhook-manager-container">
                <header className="webhook-manager-header">
                    <div className="header-title-group">
                        <h1 id="page-title">Integrações Webhook</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Buscar integração..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--wh-border)',
                                    borderRadius: '12px',
                                    padding: '0.6rem 1rem 0.6rem 2.5rem',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    width: '200px',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                        <button
                            id="btn-new-webhook"
                            className="btn-new-webhook"
                            onClick={handleOpenCreate}
                        >
                            <span>+</span> Novo Webhook
                        </button>
                    </div>
                </header>

                <BulkActionToolbar
                    selectedWebhooks={selectedWebhooks}
                    webhooks={webhooks}
                    toggleSelectAllWebhooks={() => {
                        if (selectedWebhooks.size === webhooks.length) setSelectedWebhooks(new Set());
                        else setSelectedWebhooks(new Set(webhooks.map(w => w.id)));
                    }}
                    onBulkDelete={() => setConfirmModal({
                        isOpen: true,
                        webhookId: null,
                        webhookName: `${selectedWebhooks.size} integrações`,
                        isBulk: true
                    })}
                    onClearSelection={() => setSelectedWebhooks(new Set())}
                />

                <WebhookList
                    webhooks={webhooks.filter(w => {
                        const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesSearch;
                    })}
                    loading={webhooksLoading}
                    selectedWebhooks={selectedWebhooks}
                    toggleSelectWebhook={(id) => setSelectedWebhooks(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                    handleToggleActive={handleToggleActive}
                    togglingId={togglingId}
                    copyToClipboard={copyToClipboard}
                    copiedToken={copiedToken}
                    onViewErrors={(wh) => { setSelectedWebhook(wh); setHistoryTab('pipeline'); setHistoryFilters(f => ({ ...f, status: 'error' })); fetchEvents(wh, { ...historyFilters, status: 'error' }); }}
                    onViewHistory={(wh) => { setSelectedWebhook(wh); setHistoryTab('pipeline'); fetchEvents(wh); }}
                    onViewLeads={(wh) => fetchLeads(wh)}
                    onEdit={handleOpenEdit}
                    onDelete={(wh) => setConfirmModal({ isOpen: true, webhookId: wh.id, webhookName: wh.name })}
                />
            </div>

            {/* PORTAL DE MODAIS — RENDERIZADO NO BODY PARA OVERLAY REALMENTE GLOBAL */}
            {createPortal(
                <div className="modals-portal">
                {selectedWebhook && !leadHistoryModal && (
                    <HistoryModal
                        selectedWebhook={selectedWebhook}
                        onClose={() => setSelectedWebhook(null)}
                        historyTab={historyTab}
                        setHistoryTab={setHistoryTab}
                        events={events}
                        eventsLoading={eventsLoading}
                        historyFilters={historyFilters}
                        setHistoryFilters={setHistoryFilters}
                        onFetchEvents={fetchEvents}
                        onClearFilters={clearHistoryFilters}
                        historyTotal={historyTotal}
                        historyPage={historyPage}
                        setHistoryPage={setHistoryPage}
                        historyLimit={historyLimit}
                        setHistoryLimit={setHistoryLimit}
                        selectedEvents={selectedEvents}
                        setSelectedEvents={setSelectedEvents}
                        handleBulkDelete={() => setConfirmEventDelete({ isOpen: true, event: null, isBulk: true })}
                        onDeleteEvent={(event) => setConfirmEventDelete({ isOpen: true, event, isBulk: false })}
                    />
                )}

                {leadsModal && (
                    <LeadsModal
                        leadsModal={leadsModal}
                        setLeadsModal={setLeadsModal}
                        onClose={() => setLeadsModal(null)}
                        selectedLeads={selectedLeads}
                        setSelectedLeads={setSelectedLeads}
                        toggleSelectLead={toggleSelectLead}
                        toggleSelectAllLeads={toggleSelectAllLeads}
                        onBulkDelete={() => setConfirmLeadDelete({ isOpen: true, lead: null, isBulk: true })}
                        onDeleteLead={(lead) => setConfirmLeadDelete({ isOpen: true, lead, isBulk: false })}
                        onSyncAll={() => handleSyncAll(leadsModal.webhook)}
                        onSearch={(q) => fetchLeads(leadsModal.webhook, 1, leadsModal.pageSize, q, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta)}
                        onFilterChange={(f) => fetchLeads(leadsModal.webhook, 1, leadsModal.pageSize, leadsModal.search, f.podeEnviar ?? leadsModal.podeEnviar, f.dateStart ?? leadsModal.dateStart, f.dateEnd ?? leadsModal.dateEnd, f.janelaAberta ?? leadsModal.janelaAberta)}
                        onPageChange={(p) => fetchLeads(leadsModal.webhook, p, leadsModal.pageSize, leadsModal.search, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta)}
                        onViewHistory={(lead) => {
                            setLeadHistoryModal({ lead, webhook: leadsModal.webhook });
                            setLeadsModal(null); 
                        }}
                        deletingLeads={deletingLeads}
                    />
                )}

                {leadHistoryModal && (
                    <LeadHistoryModal
                        lead={leadHistoryModal.lead}
                        webhook={leadHistoryModal.webhook}
                        onClose={() => {
                            const wh = leadHistoryModal.webhook;
                            setLeadHistoryModal(null);
                            if (wh) fetchLeads(wh);
                        }}
                    />
                )}

                {editingWebhook && (
                    <EditWebhookModal
                        editingWebhook={editingWebhook}
                        onClose={() => setEditingWebhook(null)}
                        editTab={editTab}
                        setEditTab={setEditTab}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        handleEdit={handleEdit}
                        editSaving={editSaving}
                        editError={editError}
                        agents={agents}
                        handleGenerateDescription={handleGenerateDescription}
                        editAllowedInput={editAllowedInput}
                        setEditAllowedInput={setEditAllowedInput}
                        editBlockedInput={editBlockedInput}
                        setEditBlockedInput={setEditBlockedInput}
                        editDeleteInput={editDeleteInput}
                        setEditDeleteInput={setEditDeleteInput}
                        chatwootGlobal={chatwootGlobal}
                        chatwootLabels={chatwootLabels}
                        labelsLoading={labelsLoading}
                        setConfirmRemoveFU={setConfirmRemoveFU}
                        handleCreate={handleCreate}
                    />
                )}

                {/* Confirmação de Deleção de Webhook */}
                {confirmModal.isOpen && (
                    <div className="premium-modal-overlay">
                        <div className="premium-modal-content compact" onClick={e => e.stopPropagation()}>
                            <div className="modal-header-premium">
                                <div className="header-info">
                                    <span className="header-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>⚠️</span>
                                    <span className="header-title">Confirmar Exclusão</span>
                                </div>
                            </div>
                            <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--wh-text-secondary)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                                    {confirmModal.isBulk 
                                        ? `Tem certeza que deseja excluir permanentemente as ${confirmModal.webhookName} selecionadas?`
                                        : `Tem certeza que deseja excluir permanentemente a integração "${confirmModal.webhookName}"?`
                                    }
                                    <br/><span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Esta ação não pode ser desfeita.</span>
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button 
                                        onClick={() => setConfirmModal({ ...confirmModal, isOpen: false, isBulk: false })} 
                                        className="btn-action-edit"
                                        style={{ padding: '0.8rem 2rem', borderRadius: '14px' }}
                                    >Cancelar</button>
                                    <button 
                                        onClick={handleDeleteWebhook}
                                        className="btn-new-webhook" 
                                        style={{ background: '#ef4444', borderColor: '#ef4444', padding: '0.8rem 2rem', borderRadius: '14px', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)' }}
                                    >Sim, Excluir</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmação de Remoção de Follow-up Step */}
                {confirmRemoveFU && (
                    <div className="premium-modal-overlay">
                        <div className="premium-modal-content compact" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                             <div className="modal-header-premium">
                                 <div className="header-info">
                                     <span className="header-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>🗑️</span>
                                     <span className="header-title">Remover Passo</span>
                                 </div>
                             </div>
                             <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                 <p style={{ color: 'var(--wh-text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                                     Tem certeza que deseja remover este passo do follow-up?
                                 </p>
                                 <div style={{ display: 'flex', gap: '1rem' }}>
                                     <button className="btn-action-edit" onClick={() => setConfirmRemoveFU(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '14px' }}>Não, Manter</button>
                                     <button className="btn-action-delete" onClick={() => removeFollowupStep(confirmRemoveFU.index, confirmRemoveFU.modal)} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 600, cursor: 'pointer', padding: '0.8rem', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)' }}>Sim, Remover</button>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {/* Confirmação de Exclusão de Lead */}
                {confirmLeadDelete.isOpen && (
                    <div className="premium-modal-overlay">
                        <div className="premium-modal-content compact" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                             <div className="modal-header-premium">
                                 <div className="header-info">
                                     <span className="header-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>⚠️</span>
                                     <span className="header-title">Confirmar Exclusão</span>
                                 </div>
                             </div>
                             <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                 <p style={{ color: 'var(--wh-text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                                     {confirmLeadDelete.isBulk 
                                         ? `Tem certeza que deseja excluir permanentemente os ${selectedLeads.size} contatos selecionados?`
                                         : <>Tem certeza que deseja excluir o contato <strong>{confirmLeadDelete.lead?.telefone}</strong>?</>
                                     }
                                     <br/>
                                     <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Esta ação é permanente e removerá todo o histórico.</span>
                                 </p>
                                 <div style={{ display: 'flex', gap: '1rem' }}>
                                     <button className="btn-action-edit" onClick={() => setConfirmLeadDelete({ isOpen: false, lead: null, isBulk: false })} style={{ flex: 1, padding: '0.8rem', borderRadius: '14px' }}>Cancelar</button>
                                     <button 
                                         className="btn-action-delete" 
                                         disabled={isDeletingLead}
                                         onClick={async () => {
                                             setIsDeletingLead(true);
                                             try {
                                                 const ids = confirmLeadDelete.isBulk ? Array.from(selectedLeads) : [confirmLeadDelete.lead.id];
                                                 const res = await api.post(`/webhooks/${leadsModal.webhook.id}/leads/delete-batch`, { lead_ids: ids });
                                                 
                                                 if (res.ok) {
                                                     fetchLeads(leadsModal.webhook, leadsModal.page, leadsModal.pageSize, leadsModal.search);
                                                     if (confirmLeadDelete.isBulk) setSelectedLeads(new Set());
                                                     setConfirmLeadDelete({ isOpen: false, lead: null, isBulk: false });
                                                     showToast(confirmLeadDelete.isBulk ? 'Contatos excluídos!' : 'Lead excluído com sucesso!');
                                                 } else {
                                                     showToast('Erro ao excluir contato(s)', 'error');
                                                 }
                                             } catch (err) {
                                                 console.error("Erro ao excluir leads:", err);
                                                 showToast('Erro de conexão ao excluir contatos', 'error');
                                             } finally {
                                                 setIsDeletingLead(false);
                                             }
                                         }}
                                         style={{ 
                                             flex: 1, background: '#ef4444', color: '#fff', border: 'none', 
                                             borderRadius: '14px', fontWeight: 600, cursor: isDeletingLead ? 'not-allowed' : 'pointer', 
                                             padding: '0.8rem', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                                             opacity: isDeletingLead ? 0.7 : 1,
                                             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                         }}
                                     >
                                         {isDeletingLead ? (
                                             <>
                                                 <span className="spinner-small" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                                                 Excluindo...
                                             </>
                                         ) : 'Sim, Excluir'}
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {/* Confirmação de Exclusão de Evento */}
                {confirmEventDelete.isOpen && (
                    <div className="premium-modal-overlay" style={{ zIndex: 1020 }}>
                        <div className="premium-modal-content compact" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                             <div className="modal-header-premium">
                                 <div className="header-info">
                                     <span className="header-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>⚠️</span>
                                     <span className="header-title">Excluir Mensagem</span>
                                 </div>
                             </div>
                             <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                                 <p style={{ color: 'var(--wh-text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                                     {confirmEventDelete.isBulk 
                                         ? `Tem certeza que deseja excluir permanentemente os ${selectedEvents.size} eventos selecionados?`
                                         : <>Tem certeza que deseja excluir permanentemente a mensagem <strong>#{confirmEventDelete.event?.id}</strong>?</>
                                     }
                                     <br/>
                                     <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Esta ação não pode ser desfeita.</span>
                                 </p>
                                 <div style={{ display: 'flex', gap: '1rem' }}>
                                     <button className="btn-action-edit" onClick={() => setConfirmEventDelete({ isOpen: false, event: null, isBulk: false })} style={{ flex: 1, padding: '0.8rem', borderRadius: '14px' }}>Cancelar</button>
                                     <button 
                                         className="btn-action-delete" 
                                         onClick={() => {
                                             const ids = confirmEventDelete.isBulk ? Array.from(selectedEvents) : [confirmEventDelete.event.id];
                                             api.post(`/webhooks/${selectedWebhook.id}/events/bulk-delete`, { event_ids: ids })
                                             .then((res) => {
                                                 if (res.ok) {
                                                     fetchEvents(selectedWebhook);
                                                     if (confirmEventDelete.isBulk) setSelectedEvents(new Set());
                                                     setConfirmEventDelete({ isOpen: false, event: null, isBulk: false });
                                                     showToast(confirmEventDelete.isBulk ? 'Eventos excluídos!' : 'Mensagem excluída!');
                                                 } else {
                                                     showToast('Erro ao excluir evento(s)', 'error');
                                                 }
                                             })
                                             .catch(() => {
                                                 setConfirmEventDelete({ isOpen: false, event: null, isBulk: false });
                                                 showToast('Erro de conexão ao excluir eventos', 'error');
                                             });
                                         }}
                                         style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 600, cursor: 'pointer', padding: '0.8rem', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)' }}
                                     >Sim, Excluir</button>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {/* Toast System — Agora dentro do portal para sobrepor tudo */}
                {toast.show && (
                    <div className={`toast-premium ${toast.type}`}>
                        <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
                        {toast.message}
                    </div>
                )}
            </div>,
            document.body
        )}
        </>
    );
};

export default WebhookManager;
