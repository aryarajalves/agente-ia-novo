import React from 'react';
import { useDashboard } from '../DashboardContext';

const MetricCard = ({ title, value, icon, color }) => (
    <div className="stat-card">
        <div className="stat-icon-wrapper" style={{ background: `${color}15`, color: color }}>
            {icon}
        </div>
        <div className="stat-info">
            <span className="stat-value">{value}</span>
            <span className="stat-title">{title}</span>
        </div>
    </div>
);

const MetricsGrid = () => {
    const { stats } = useDashboard();

    return (
        <div className="stats-row">
            <MetricCard
                title="Agentes Ativos"
                value={stats.total_agents}
                icon="🤖"
                color="#6366f1"
            />
            <MetricCard
                title="Bases Conhecimento"
                value={stats.total_knowledge_bases}
                icon="📚"
                color="#10b981"
            />
            <MetricCard
                title="Total Interações"
                value={stats.total_interactions}
                icon="💬"
                color="#0ea5e9"
            />
            <MetricCard
                title="Custo Estimado"
                value={`R$ ${stats.total_cost.toFixed(2)}`}
                icon="💰"
                color="#f59e0b"
            />
        </div>
    );
};

export default MetricsGrid;
