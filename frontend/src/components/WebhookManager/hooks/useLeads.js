import { useState, useCallback } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';

export const useLeads = () => {
    const [leadsModal, setLeadsModal] = useState(null);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [bulkDeleteModal, setBulkDeleteModal] = useState(null);

    const fetchLeads = useCallback(async (webhook, page = 1, pageSize = 20, search = '', podeEnviar = 'all', ds = '', de = '', janelaAberta = 'all', semMensagens = 'all') => {
        setLeadsModal(prev => ({ 
            ...(prev || { webhook }), 
            loading: true, 
            leads: prev?.leads || [],
            page, pageSize, search, podeEnviar, 
            dateStart: ds, dateEnd: de,
            janelaAberta,
            semMensagens
        }));
        
        try {
            let url = `/webhooks/${webhook.id}/leads?page=${page}&page_size=${pageSize}`;
            if (search) url += `&q=${encodeURIComponent(search)}`;
            if (podeEnviar !== 'all') url += `&pode_enviar=${podeEnviar === 'true'}`;
            if (janelaAberta !== 'all') url += `&janela_aberta=${janelaAberta === 'true'}`;
            if (semMensagens !== 'all') url += `&sem_mensagem=${semMensagens === 'true'}`;
            if (ds) url += `&date_start=${ds}`;
            if (de) url += `&date_end=${de}`;

            const res = await api.get(url);
            const data = await res.json();
            
            setLeadsModal(prev => ({
                ...prev,
                leads: data.leads || [],
                total: data.total || 0,
                loading: false
            }));
        } catch (e) {
            console.error('Erro ao buscar leads:', e);
            setLeadsModal(prev => ({ ...prev, loading: false }));
            showToast('Erro ao carregar contatos', 'error');
        }
    }, []);

    const toggleSelectLead = (id) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllLeads = (force) => {
        if (!leadsModal?.leads) return;
        const allIdsOnPage = leadsModal.leads.map(l => l.id);
        const allSelected = typeof force === 'boolean' ? !force : allIdsOnPage.every(id => selectedLeads.has(id));
        
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (allSelected) {
                allIdsOnPage.forEach(id => next.delete(id));
            } else {
                allIdsOnPage.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleSyncAll = async (webhook) => {
        try {
            const res = await api.post(`/webhooks/${webhook.id}/leads/sync-all`);
            if (res.ok) {
                showToast('Sincronização iniciada com sucesso!');
                fetchLeads(webhook);
            }
        } catch (e) {
            showToast('Erro ao iniciar sincronização', 'error');
        }
    };

    const [deletingLeads, setDeletingLeads] = useState(false);

    const handleDeleteSelectedLeads = async () => {
        if (selectedLeads.size === 0 || !leadsModal?.webhook) return;
        setDeletingLeads(true);
        try {
            const res = await api.post(`/webhooks/${leadsModal.webhook.id}/leads/delete-batch`, {
                lead_ids: Array.from(selectedLeads)
            });
            if (res.ok) {
                showToast(`✅ ${selectedLeads.size} leads removidos.`);
                setSelectedLeads(new Set());
                fetchLeads(leadsModal.webhook, leadsModal.page, leadsModal.pageSize, leadsModal.search);
            }
        } catch (e) {
            showToast('Erro ao remover leads', 'error');
        } finally {
            setDeletingLeads(false);
        }
    };

    const handleDeleteAllLeads = async () => {
        if (!leadsModal?.webhook) return;
        setDeletingLeads(true);
        try {
            const res = await api.delete(`/webhooks/${leadsModal.webhook.id}/leads/all`);
            if (res.ok) {
                showToast('✅ Todos os leads foram removidos.');
                setSelectedLeads(new Set());
                fetchLeads(leadsModal.webhook);
            }
        } catch (e) {
            showToast('Erro ao remover todos os leads', 'error');
        } finally {
            setDeletingLeads(false);
        }
    };

    return {
        leadsModal, setLeadsModal,
        fetchLeads,
        selectedLeads, setSelectedLeads,
        toggleSelectLead,
        toggleSelectAllLeads,
        bulkDeleteModal, setBulkDeleteModal,
        handleSyncAll,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads,
        deletingLeads
    };

};
