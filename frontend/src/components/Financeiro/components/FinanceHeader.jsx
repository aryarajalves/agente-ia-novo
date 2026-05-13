import React from 'react';
import { useFinance } from '../FinanceContext';
import { useFinanceMetrics } from '../hooks/useFinanceMetrics';

const FinanceHeader = () => {
    const { viewMode, setViewMode, setCurrentPage } = useFinance();
    const { activeRowsData, activeTotalCost } = useFinanceMetrics();

    const handleToggle = (mode) => {
        setViewMode(mode);
        setCurrentPage(1);
    };

    const totalTokens = activeRowsData.reduce((s, r) => s + (r.total_tokens || 0), 0);
    const totalMessages = activeRowsData.reduce((s, r) => s + (r.unique_sessions || 0), 0);
    const avgCost = totalMessages > 0 ? activeTotalCost / totalMessages : 0;

    const kpis = [
        {
            id: 'total-gasto',
            icon: '💸',
            label: 'Total Gasto',
            value: `R$ ${activeTotalCost.toFixed(2)}`,
            sub: viewMode === 'agents' ? 'em agentes' : 'em fine-tuning',
            accent: 'green',
        },
        {
            id: 'tokens-totais',
            icon: '🧮',
            label: 'Tokens Totais',
            value: totalTokens > 0 ? totalTokens.toLocaleString('pt-BR') : '—',
            sub: 'tokens processados',
            accent: 'purple',
        },
        {
            id: 'sessoes',
            icon: '💬',
            label: 'Sessões',
            value: totalMessages > 0 ? totalMessages.toLocaleString('pt-BR') : '—',
            sub: 'chats únicos',
            accent: 'yellow',
        },
        {
            id: 'custo-medio',
            icon: '📊',
            label: 'Custo Médio/Sessão',
            value: avgCost > 0 ? `R$ ${avgCost.toFixed(4)}` : '—',
            sub: 'por conversa',
            accent: 'pink',
        },
    ];

    return (
        <header className="finance-header">
            <div className="header-top-row">
                <div className="header-info">
                    <h1>Financeiro 💰</h1>
                    <p className="subtitle">Controle de gastos e inteligência de tokens</p>
                    <div className="view-mode-toggle">
                        <button
                            id="btn-view-agents"
                            className={viewMode === 'agents' ? 'active' : ''}
                            onClick={() => handleToggle('agents')}
                        >
                            🤖 Agentes
                        </button>
                    </div>
                </div>
            </div>

            <div className="kpi-cards-row">
                {kpis.map((kpi) => (
                    <div key={kpi.id} id={kpi.id} className={`kpi-card ${kpi.accent}`}>
                        <span className="kpi-icon">{kpi.icon}</span>
                        <span className="kpi-label">{kpi.label}</span>
                        <span className="kpi-value">{kpi.value}</span>
                        <span className="kpi-sub">{kpi.sub}</span>
                    </div>
                ))}
            </div>
        </header>
    );
};

export default FinanceHeader;
