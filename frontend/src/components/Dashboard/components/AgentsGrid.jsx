import React from 'react';
import { useDashboard } from '../DashboardContext';
import AgentCard from './AgentCard';

const AgentsGrid = () => {
    const { filteredAgents, kbList, error } = useDashboard();

    if (error) return <div className="error-state">Erro: {error}</div>;
    if (filteredAgents.length === 0) return <div className="empty-state">Nenhum agente encontrado.</div>;

    return (
        <div className="agents-grid-responsive">
            {filteredAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} kbList={kbList} />
            ))}
        </div>
    );
};

export default AgentsGrid;
