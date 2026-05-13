import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/helpers';
import { api } from '../../../api/client';
import { API_URL } from '../../../config';
import AutomationPipelineModal from './AutomationPipelineModal';

const LeadHistoryModal = ({
    lead,
    webhook,
    onClose
}) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [selectedPipelineEvent, setSelectedPipelineEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, eventId: null });

    // Bloquear scroll ao montar
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    const fetchLeadHistory = async () => {
        if (!webhook || !webhook.id) return;
        setLoading(true);
        try {
            // Normalizar telefone para a busca (remover +)
            const cleanPhone = (lead.telefone || '').replace('+', '');
            // Buscamos todos os eventos (usuário e agente) para este lead
            const res = await api.get(`/webhooks/${webhook.id}/events?search=${cleanPhone}&page=${page}&limit=${limit}`);
            const data = await res.json();

            // Garantir que temos a lista de itens correta do backend
            setEvents(data.items || data.events || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error('Erro ao buscar histórico do lead:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeadHistory();
    }, [page, limit, webhook, lead.telefone]);

    const handleDeleteEvent = async (eventId) => {
        setConfirmDelete({ isOpen: true, eventId });
    };

    const confirmDeleteEvent = async () => {
        try {
            const res = await api.post(`/webhooks/${webhook.id}/events/bulk-delete`, { event_ids: [confirmDelete.eventId] });
            if (res.ok) {
                fetchLeadHistory();
                setConfirmDelete({ isOpen: false, eventId: null });
            }
        } catch (e) {
            console.error('Erro ao excluir evento:', e);
        }
    };

    // WebSocket para atualização em tempo real
    useEffect(() => {
        if (!webhook || !webhook.id) return;
        
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
        let ws;
        
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_event' && data.webhook_id === webhook.id) {
                        const cleanPhone = (lead.telefone || '').replace('+', '');
                        const eventPhone = (data.event.telefone || '').replace('+', '');
                        
                        if (eventPhone === cleanPhone) {
                            // Adicionar o novo evento no topo da lista se ele não existir
                            setEvents(prev => {
                                if (prev.some(e => e.id === data.event.id)) return prev;
                                return [data.event, ...prev];
                            });
                            setTotal(prev => prev + 1);
                        }
                    }
                } catch (e) {
                    console.error('Erro ao processar mensagem WS:', e);
                }
            };
            ws.onerror = (err) => console.error('Erro WS:', err);
        } catch (e) {
            console.error('Falha ao conectar WS:', e);
        }

        return () => {
            if (ws) ws.close();
        };
    }, [webhook.id, lead.telefone]);

    if (!webhook) return null;

    const getMessageTypeLabel = (type) => {
        switch (type) {
            case 'image': return '🖼️ Imagem';
            case 'audio': return '🎙️ Áudio';
            case 'video': return '🎥 Vídeo';
            case 'document': return '📄 Doc';
            default: return '📝 Texto';
        }
    };

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1050 }}>
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '1050px', height: '90vh', maxHeight: '900px', display: 'flex', flexDirection: 'column' }}
            >                {/* Cabeçalho Premium — Alterado para 'Histórico' conforme solicitado */}
                <div className="modal-header-premium" style={{ padding: '1rem 2rem' }}>
                    <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                        }}>📊</div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.1rem' }}>Histórico</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                <span style={{ color: '#94a3b8' }}>{lead.contato_nome || lead.telefone}</span> · {total} disparos
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px' }}>✕</button>
                </div>

                {/* Tabela de Disparos (Estilo Imagem 02/04) */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(15, 23, 42, 0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ID INTERNO</th>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>MENSAGEM USUÁRIO</th>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ORIGEM / TIPO</th>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>RESPOSTA IA</th>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>DATA/HORA</th>
                                <th style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Buscando disparos...</td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Nenhum disparo encontrado.</td>
                                </tr>
                            ) : events.map(event => {
                                const isAgent = event.dono === 'agente' || event.dono === 'bot';
                                const isGrouped = event.status === 'grouped';
                                const message = event.mensagem || event.conteudo || event.agent_response || '—';

                                return (
                                    <tr 
                                        key={event.id} 
                                        style={{ 
                                            borderBottom: '1px solid rgba(255,255,255,0.02)', 
                                            transition: 'background 0.2s',
                                            opacity: isGrouped ? 0.4 : 1,
                                            filter: isGrouped ? 'grayscale(0.5)' : 'none'
                                        }} 
                                        onMouseOver={e => !isGrouped && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} 
                                        onMouseOut={e => !isGrouped && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{event.id}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: isAgent ? 'rgba(255,255,255,0.2)' : '#e2e8f0', maxWidth: '250px' }}>
                                            {!isAgent && (
                                                <div style={{ maxHeight: '60px', overflowY: 'auto', lineHeight: '1.4', fontStyle: isGrouped ? 'italic' : 'normal' }}>
                                                    {isGrouped && <span style={{ fontSize: '0.65rem', marginRight: '4px', opacity: 0.8 }}>📦</span>}
                                                    {message}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ 
                                                    fontSize: '0.6rem', fontWeight: 900, 
                                                    background: isGrouped ? 'rgba(148, 163, 184, 0.1)' : (isAgent ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)'), 
                                                    color: isGrouped ? '#94a3b8' : (isAgent ? '#818cf8' : '#10b981'),
                                                    padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                                                    border: `1px solid ${isGrouped ? 'rgba(148, 163, 184, 0.2)' : (isAgent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)')}`
                                                }}>
                                                    {isGrouped ? 'AGRUPADO' : (isAgent ? 'AGENTE' : 'USUÁRIO')}
                                                </span>
                                                <span style={{ 
                                                    fontSize: '0.65rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)', 
                                                    padding: '4px 8px', borderRadius: '6px', color: '#94a3b8' 
                                                }}>
                                                    {getMessageTypeLabel(event.message_type)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#818cf8', maxWidth: '250px' }}>
                                            {(isAgent || event.agent_response) && !isGrouped && (
                                                <div style={{ maxHeight: '60px', overflowY: 'auto', lineHeight: '1.4' }}>
                                                    {isAgent ? message : event.agent_response}
                                                </div>
                                            )}
                                            {isGrouped && <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Absorvida pela próxima</span>}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(event.created_at)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                {!isAgent && (
                                                    <button
                                                        onClick={() => setSelectedPipelineEvent(event)}
                                                        title="Ver Pipeline"
                                                        style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#818cf8', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                                                    >⚡</button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteEvent(event.id)}
                                                    title="Excluir"
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Rodapé — Paginação */}
                <div style={{ padding: '1.25rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Exibir: <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px' }}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select>
                        <span style={{ marginLeft: '1rem' }}>Mostrando {events.length} de {total} eventos</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.5rem' }}>
                                Página <strong>{page}</strong> de <strong>{Math.max(1, Math.ceil(total / limit))}</strong>
                            </div>
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer' }}>Próxima</button>
                        </div>
                    </div>
                </div>

                {selectedPipelineEvent && (
                    <AutomationPipelineModal
                        event={selectedPipelineEvent}
                        onClose={() => setSelectedPipelineEvent(null)}
                    />
                )}

                {/* Popup de Confirmação Premium */}
                {confirmDelete.isOpen && (
                    <div className="premium-modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="premium-modal-content compact" style={{ maxWidth: '380px', padding: '1.5rem', textAlign: 'center' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.5rem' }}>⚠️</div>
                            <h2 style={{ margin: '0 0 0.75rem 0', fontWeight: 900, fontSize: '1.2rem' }}>Excluir Mensagem</h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                                Tem certeza que deseja excluir permanentemente a mensagem <strong style={{ color: '#fff' }}>#{confirmDelete.eventId}</strong>?
                                <br /><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Esta ação não pode ser desfeita.</span>
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setConfirmDelete({ isOpen: false, eventId: null })}
                                    style={{ padding: '0.7rem 1.5rem', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', minWidth: '110px' }}
                                >Cancelar</button>
                                <button
                                    onClick={confirmDeleteEvent}
                                    style={{ padding: '0.7rem 1.5rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', minWidth: '110px' }}
                                >Sim, Excluir</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadHistoryModal;
