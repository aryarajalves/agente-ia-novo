import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../../api/client';
import { API_URL } from '../../../config';

export const useEvents = () => {
    const [selectedWebhook, setSelectedWebhook] = useState(null);
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({ status: 'all', start_date: '', end_date: '', search: '' });
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit, setHistoryLimit] = useState(10);
    const [historyTab, setHistoryTab] = useState('pipeline');
    const [selectedEvents, setSelectedEvents] = useState(new Set());
    const pollRef = useRef(null);

    const startPolling = useCallback((webhookId, filters, currentTab, page, limit) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const params = new URLSearchParams();
                params.append('page', page);
                params.append('limit', limit);
                if (filters.status && filters.status !== 'all') params.append('status', filters.status);
                if (filters.start_date) params.append('start_date', filters.start_date);
                if (filters.end_date) params.append('end_date', filters.end_date);
                if (filters.search) params.append('search', filters.search);
                
                let eventType = 'message';
                if (currentTab === 'pipeline') eventType = 'followup';
                if (currentTab === 'memoria') eventType = 'memory';
                params.append('event_type', eventType);

                const res = await api.get(`/webhooks/${webhookId}/events?${params.toString()}`);
                const data = await res.json();
                const items = data.items || [];
                
                if (Array.isArray(items)) {
                    setEvents(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(items)) return prev;
                        return items;
                    });
                    setHistoryTotal(data.total || 0);
                }
            } catch (e) {
                console.error("Erro no polling:", e);
            }
        }, 3000);
    }, []);

    const fetchEvents = useCallback(async (webhook, filters, isSilent = false) => {
        const targetWebhook = webhook || selectedWebhook;
        if (!targetWebhook) return;
        
        if (!isSilent) setEventsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', historyPage);
            params.append('limit', historyLimit);
            const activeFilters = filters || historyFilters;
            
            if (activeFilters.status && activeFilters.status !== 'all') params.append('status', activeFilters.status);
            if (activeFilters.start_date) params.append('start_date', activeFilters.start_date);
            if (activeFilters.end_date) params.append('end_date', activeFilters.end_date);
            if (activeFilters.search) params.append('search', activeFilters.search);
            
            let eventType = 'message';
            if (historyTab === 'pipeline') eventType = 'followup';
            if (historyTab === 'memoria') eventType = 'memory';
            params.append('event_type', eventType);

            const res = await api.get(`/webhooks/${targetWebhook.id}/events?${params.toString()}`);
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            setEvents(items);
            setHistoryTotal(data?.total || 0);
            
            const hasPending = (data.items || []).some(e => ['pending', 'processing'].includes(e.status));
            if (hasPending) startPolling(targetWebhook.id, activeFilters, historyTab, historyPage, historyLimit);
        } catch (e) {
            console.error('Erro ao buscar eventos:', e);
        } finally {
            if (!isSilent) setEventsLoading(false);
        }
    }, [selectedWebhook, historyFilters, historyPage, historyLimit, historyTab, startPolling]);

    const clearHistoryFilters = () => {
        setHistoryFilters({ status: 'all', start_date: '', end_date: '', search: '' });
        setHistoryPage(1);
    };

    useEffect(() => {
        if (selectedWebhook) {
            fetchEvents(selectedWebhook, historyFilters);
            
            // WebSocket para atualização em tempo real
            const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
            let ws;
            
            try {
                ws = new WebSocket(wsUrl);
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'new_event' && data.webhook_id === selectedWebhook.id) {
                            // Se estivermos na primeira página, damos um refresh silencioso
                            if (historyPage === 1) {
                                fetchEvents(selectedWebhook, historyFilters, true);
                            }
                        } else if (data.type === 'status_update' && data.webhook_id === selectedWebhook.id) {
                            // Atualizar status do evento na lista sem precisar de fetch completo
                            setEvents(prev => prev.map(ev => 
                                ev.id === data.event_id 
                                ? { 
                                    ...ev, 
                                    status: data.status, 
                                    processing_steps: data.steps ? JSON.stringify(data.steps) : ev.processing_steps,
                                    updated_at: new Date().toISOString() 
                                } 
                                : ev
                            ));
                        }
                    } catch (e) {
                        console.error('Erro ao processar mensagem WS:', e);
                    }
                };
            } catch (e) {
                console.error('Falha ao conectar WS:', e);
            }

            return () => {
                if (ws) ws.close();
                if (pollRef.current) clearInterval(pollRef.current);
            };
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [selectedWebhook, historyFilters, historyTab, historyPage, historyLimit, fetchEvents]);

    return {
        selectedWebhook, setSelectedWebhook,
        events, setEvents,
        eventsLoading,
        historyFilters, setHistoryFilters,
        historyTotal, historyPage, setHistoryPage,
        historyLimit, setHistoryLimit,
        historyTab, setHistoryTab,
        fetchEvents, clearHistoryFilters,
        selectedEvents, setSelectedEvents
    };
};
