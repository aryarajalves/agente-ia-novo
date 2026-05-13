import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../DashboardContext';
import { api } from '../../../api/client';
import ConfirmModal from '../../ConfirmModal';

const AgentCard = ({ agent }) => {
    const navigate = useNavigate();
    const { selectedAgents, setSelectedAgents, agents, setAgents } = useDashboard();
    const [toast, setToast] = React.useState(null);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [confirmAction, setConfirmAction] = React.useState(() => () => {});
    const isSelected = selectedAgents.has(agent.id);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toggleSelect = (e) => {
        e.stopPropagation();
        setSelectedAgents(prev => {
            const next = new Set(prev);
            if (next.has(agent.id)) next.delete(agent.id);
            else next.add(agent.id);
            return next;
        });
    };

    const handleCopyLink = (e) => {
        e.stopPropagation();
        const link = `${window.location.origin}/playground?agentId=${agent.id}`;
        navigator.clipboard.writeText(link);
        showToast('Link copiado com sucesso! ✨');
    };

    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleToggleStatus = async (e) => {
        if (e) e.stopPropagation();
        try {
            const response = await api.post(`/agents/${agent.id}/toggle_status`);
            if (response.ok) {
                const data = await response.json();
                // Atualiza o estado global sem recarregar a página
                const updatedAgents = agents.map(a => 
                    a.id === agent.id ? { ...a, is_active: data.is_active } : a
                );
                setAgents(updatedAgents);
                showToast(`Agente ${data.is_active ? 'ativado' : 'pausado'} com sucesso!`);
            }
        } catch (err) {
            console.error("Erro ao alterar status:", err);
            showToast('Erro ao alterar status', 'error');
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        setConfirmAction(() => async () => {
            setIsDeleting(true);
            try {
                const response = await api.delete(`/agents/${agent.id}`);
                if (response.ok) {
                    showToast('Agente excluído com sucesso!');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    const data = await response.json();
                    showToast(data.detail || 'Erro ao excluir agente', 'error');
                    setIsDeleting(false);
                    setShowConfirm(false);
                }
            } catch (err) {
                console.error("Erro ao excluir agente:", err);
                showToast('Erro ao excluir agente', 'error');
                setIsDeleting(false);
                setShowConfirm(false);
            }
        });
        setShowConfirm(true);
    };

    return (
        <div className={`modern-agent-card ${!agent.is_active ? 'card-inactive' : ''}`}>
            <div className="card-top-border" />
            
            <div className="card-header">
                <div className="header-left">
                    <div 
                        className={`selection-checkbox ${isSelected ? 'selected' : ''}`} 
                        onClick={toggleSelect}
                    >
                        {isSelected && "✓"}
                    </div>
                    <div className={`status-indicator ${agent.is_active ? 'active' : 'paused'}`} />
                </div>

                <div className="card-hover-actions">
                    <button className="action-btn-small" title="Copiar Link" onClick={handleCopyLink}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                    <button className="action-btn-small" title="Relatório">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                    <button className="action-btn-small" title={agent.is_active ? 'Pausar' : 'Ativar'} onClick={handleToggleStatus}>
                        {agent.is_active ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        )}
                    </button>
                    <button className="action-btn-small btn-danger" title="Excluir" onClick={handleDelete}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                    </button>
                </div>
            </div>

            <div className="card-body">
                <h3 className="card-title">{agent.name}</h3>
                <p className="description">
                    {agent.description || "Sem descrição definida."}
                </p>
                <div className="tech-stack">
                    <span className="tech-badge">
                        {agent.router_enabled ? agent.router_complex_model : agent.model}
                    </span>
                </div>
            </div>

            <div className="card-footer">
                <button onClick={() => navigate(`/agent/${agent.id}`)} className="btn-primary">
                    ⚙️ Configurar
                </button>
                <button onClick={() => navigate(`/playground?agentId=${agent.id}`)} className="btn-secondary">
                    💬 Chat
                </button>
            </div>

            {toast && (
                <div className={`premium-toast ${toast.type}`}>
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                    {toast.message}
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Confirmar Exclusão"
                message={<>Tem certeza que deseja excluir o agente <strong>{agent.name}</strong>? Esta ação não pode ser desfeita.</>}
                onConfirm={() => { confirmAction(); }}
                onCancel={() => setShowConfirm(false)}
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AgentCard;
