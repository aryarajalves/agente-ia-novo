import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';

const PublicSupportView = () => {
    const { token } = useParams();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals states
    const [confirmResolve, setConfirmResolve] = useState(null);
    const [resolvingId, setResolvingId] = useState(null);
    const [chatModal, setChatModal] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);

    const fetchRequests = async () => {
        try {
            const res = await api.get(`/public/support/${token}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || "Link inválido ou expirado.");
                return;
            }
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            setError("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000); // Atualiza a cada 30s
        return () => clearInterval(interval);
    }, [token]);

    const handleResolveClick = (req) => {
        setConfirmResolve(req);
    };

    const confirmResolveAction = async () => {
        if (!confirmResolve) return;
        const id = confirmResolve.id;
        setResolvingId(id);

        try {
            const res = await api.request(`/public/support/${token}/${id}/resolve`, { method: 'PATCH' });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== id));
            } else {
                alert("Erro ao finalizar atendimento");
            }
        } catch (err) {
            alert("Erro ao finalizar atendimento");
        } finally {
            setResolvingId(null);
            setConfirmResolve(null);
        }
    };

    const handleOpenChat = async (request) => {
        setChatModal(request);
        setChatLoading(true);
        setChatMessages([]);
        try {
            const res = await api.get(`/public/support/${token}/${request.session_id}/messages`);
            if (res.ok) {
                const msgs = await res.json();
                setChatMessages(msgs);
            }
        } catch (e) {
            console.error("Erro ao carregar chat", e);
        } finally {
            setChatLoading(false);
        }
    };

    const formatBrasiliaTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
        return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };

    const getTimeWaiting = (dateStr) => {
        if (!dateStr) return '';
        const diff = new Date() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Agora mesmo";
        if (mins < 60) return `Há ${mins} min`;
        return `Há ${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    // Função auxiliar para encontrar telefone nos dados extraídos
    const findPhone = (data) => {
        if (!data) return null;
        const keys = Object.keys(data);
        // Tenta chaves comuns primeiro
        const priorityKeys = ['user_phone', 'telefone', 'phone', 'contato', 'whatsapp', 'celular'];
        for (let pk of priorityKeys) {
            if (data[pk]) return String(data[pk]);
        }
        // Fallback: procura qualquer chave que contenha "tel", "cel" ou "fone"
        const fallbackKey = keys.find(k => k.toLowerCase().includes('tel') || k.toLowerCase().includes('cel') || k.toLowerCase().includes('fone'));
        return fallbackKey ? String(data[fallbackKey]) : null;
    };

    if (loading) return (
        <div className="support-dashboard loading-state">
            <div className="spinner"></div>
            <p>Carregando fila de suporte...</p>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <h2>⚠️ Acesso Negado</h2>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="support-dashboard public-view" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: '40px', textAlign: 'center', display: 'block' }}>
                <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎧 Central de Suporte Humano</h1>
                <p className="page-subtitle" style={{ fontSize: '1.1rem' }}>Solicitações em aberto aguardando atendimento.</p>
            </header>

            <div className="support-grid">
                {requests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✨</div>
                        <h3>Tudo limpo!</h3>
                        <p>Não há solicitações de suporte pendentes no momento.</p>
                    </div>
                ) : (
                    requests.map(req => {
                        const userPhone = findPhone(req.extracted_data);
                        return (
                            <div key={req.id} className="support-card animate-in">
                                <div className="card-header">
                                    <div className="user-info">
                                        <div className="user-avatar-small">
                                            {(req.user_name || "U")[0]}
                                        </div>
                                        <div>
                                            <h3>{req.user_name || "Usuário Anônimo"}</h3>
                                            <span>{req.user_email || 'Email não informado'}</span>
                                            {userPhone && (
                                                <div className="user-phone-badge">
                                                    📱 {userPhone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="wait-time" title={formatBrasiliaTime(req.created_at)}>
                                        {getTimeWaiting(req.created_at)}
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div className="info-row">
                                        <label>Agente:</label>
                                        <span>{req.agent_name}</span>
                                    </div>
                                    <div className="info-row">
                                        <label>Sessão:</label>
                                        <code className="session-code">{req.session_id}</code>
                                    </div>
                                    {(req.account_id || req.conversation_id) && (
                                        <div className="info-row" style={{ marginTop: '4px', opacity: 0.8 }}>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {req.account_id && `Account: ${req.account_id}`}
                                                {req.account_id && req.conversation_id && ' | '}
                                                {req.conversation_id && `Conv: ${req.conversation_id}`}
                                            </span>
                                        </div>
                                    )}

                                    {req.extracted_data && Object.keys(req.extracted_data).length > 0 && (
                                        <div className="extracted-vars">
                                            {Object.entries(req.extracted_data).map(([key, val]) => (
                                                <div key={key} className="var-tag">
                                                    <span className="var-key">{key}:</span> {String(val)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="reason-preview">
                                        <strong>Motivo:</strong> {req.reason || "Aguardando diagnóstico..."}
                                    </p>
                                </div>

                                <div className="card-footer">
                                    <button 
                                        className="btn-success-sm" 
                                        onClick={() => handleResolveClick(req)}
                                        disabled={resolvingId === req.id}
                                    >
                                        {resolvingId === req.id ? '⏳ Finalizando...' : '✅ Finalizar Atendimento'}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals - Chat */}
            {chatModal && (
                <div 
                    className="modal-overlay" 
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
                >
                    <div 
                        className="modal-content-wide" 
                        style={{ background: 'linear-gradient(145deg, #0d1526 0%, #1a2540 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="modal-header" style={{ padding: '1.3rem 1.8rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', color: '#a5b4fc', margin: 0 }}>💬 Histórico da Conversa</h2>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>{chatModal.user_name || 'Usuário Anônimo'} | {chatModal.session_id}</p>
                            </div>
                            <button 
                                className="close-btn-premium" 
                                onClick={() => setChatModal(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#64748b', borderRadius: '12px', width: '40px', height: '40px',
                                    cursor: 'pointer', fontSize: '1.2rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >✕</button>
                        </header>
                        <div className="modal-body chat-history-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                            {chatLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando histórico...</div>
                            ) : chatMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhuma mensagem encontrada.</div>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className={`msg-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '12px 16px', borderRadius: '15px', color: '#fff', fontSize: '0.9rem', backgroundColor: msg.role === 'user' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.7rem', marginBottom: '4px', color: msg.role === 'user' ? '#818cf8' : '#94a3b8', textTransform: 'uppercase' }}>{msg.role === 'user' ? 'Usuário' : 'Agente'}</div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    </div>
                                ))
                            )}
                        </div>
                        <footer className="modal-footer" style={{ padding: '1.1rem 1.8rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary-sm" onClick={() => setChatModal(null)}>Fechar Histórico</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Confirm Modal de Finalização */}
            <ConfirmModal
                isOpen={!!confirmResolve}
                title="Finalizar Atendimento"
                message={confirmResolve ? `Tem certeza que deseja marcar o atendimento de "${confirmResolve.user_name || 'Usuário Anônimo'}" como FINALIZADO?` : ''}
                onConfirm={confirmResolveAction}
                onCancel={() => setConfirmResolve(null)}
                type="success"
                confirmText="Sim, Finalizar"
                cancelText="Voltar"
            />

            <style>{`
                .support-dashboard.public-view { background: #070a13; min-height: 100vh; color: #fff; font-family: 'Inter', sans-serif; }
                .error-container { text-align: center; padding: 100px; color: #f87171; background: #070a13; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .error-container h2 { margin-bottom: 20px; font-size: 2rem; }
                
                /* Estilos copiados do index.css / SupportDashboard para garantir consistência */
                .page-title { background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; letter-spacing: -1px; }
                .page-subtitle { color: #64748b; font-weight: 500; }
                .support-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
                
                .support-card { background: linear-gradient(145deg, #161d2f 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 1.5rem; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative; overflow: hidden; }
                .support-card:hover { transform: translateY(-5px); border-color: rgba(99,102,241,0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
                .support-card::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(225deg, rgba(99,102,241,0.05) 0%, transparent 50%); pointer-events: none; }
                
                .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
                .user-info { display: flex; gap: 1rem; align-items: center; }
                .user-avatar-small { width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
                .user-info h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.3px; }
                .user-info span { font-size: 0.8rem; color: #64748b; font-weight: 500; }
                
                .user-phone-badge { display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; width: fit-content; margin-top: 6px; }
                .wait-time { font-size: 0.7rem; font-weight: 700; color: #f87171; background: rgba(248,113,113,0.1); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(248,113,113,0.15); }
                
                .info-row { display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-size: 0.85rem; }
                .info-row label { color: #64748b; font-weight: 600; }
                .info-row span { color: #cbd5e1; font-weight: 700; }
                .session-code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); }
                
                .reason-preview { background: rgba(99,102,241,0.08); border-left: 3px solid #6366f1; padding: 0.8rem 1rem; border-radius: 0 12px 12px 0; margin-top: 1rem; font-size: 0.9rem; color: #cbd5e1; line-height: 1.5; }
                .reason-preview strong { color: #a5b4fc; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 4px; }
                
                .extracted-vars { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.05); }
                .var-tag { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; color: #f1f5f9; font-weight: 600; }
                .var-key { color: #64748b; font-weight: 800; text-transform: uppercase; font-size: 0.65rem; margin-right: 4px; }

                .card-footer { display: grid; grid-template-columns: 1fr 1.3fr; gap: 0.75rem; margin-top: 1.5rem; }
                .btn-primary-sm, .btn-success-sm { border: none; padding: 10px; borderRadius: 12px; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
                .btn-primary-sm { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: #818cf8; }
                .btn-primary-sm:hover { background: rgba(99,102,241,0.2); transform: scale(1.02); }
                .btn-success-sm { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
                .btn-success-sm:hover { transform: scale(1.02); box-shadow: 0 6px 18px rgba(16,185,129,0.3); }

                .empty-state { grid-column: 1 / -1; background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.05); border-radius: 30px; padding: 4rem 2rem; text-align: center; color: #475569; }
                .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
                .empty-state h3 { color: #94a3b8; font-weight: 800; margin-bottom: 0.5rem; }

                .close-btn-premium { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #64748b; border-radius: 12px; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; }
                .close-btn-premium:hover { background: rgba(244,63,94,0.15); color: #fb7185; border-color: rgba(244,63,94,0.3); transform: rotate(90deg) scale(1.1); box-shadow: 0 0 20px rgba(244,63,94,0.2); }
                
                .btn-secondary-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
                .btn-secondary-sm:hover { background: rgba(255,255,255,0.1); }

                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .spinner { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #94a3b8; background: #070a13; }
                
                .animate-in { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default PublicSupportView;
