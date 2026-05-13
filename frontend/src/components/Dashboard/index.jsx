import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { useDashboardData } from './hooks/useDashboardData';
import MetricsGrid from './components/MetricsGrid';
import AgentsGrid from './components/AgentsGrid';
import AgentFilters from './components/AgentFilters';
import GlobalContextManager from '../GlobalContextManager';
import './styles/Dashboard.css';

const DashboardContent = () => {
    const { activeTab, setActiveTab, loading } = useDashboard();
    useDashboardData();

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Carregando Dashboard...</p>
        </div>
    );

    return (
        <div className="modern-dashboard fade-in">
            <header className="dashboard-header-flex">
                <div>
                    <h1>Gerenciamento de Agentes</h1>
                    <p className="subtitle">Monitore e configure sua frota de IA em tempo real</p>
                </div>
                <Link to="/agent/new" className="create-agent-btn-shiny">+ Novo Agente</Link>
            </header>

            <div className="tab-switcher">
                <button 
                    className={activeTab === 'agents' ? 'active' : ''} 
                    onClick={() => setActiveTab('agents')}
                >🤖 Meus Agentes</button>
                <button 
                    className={activeTab === 'variables' ? 'active' : ''} 
                    onClick={() => setActiveTab('variables')}
                >🌍 Variáveis Globais</button>
            </div>

            {activeTab === 'agents' ? (
                <>
                    <MetricsGrid />
                    <AgentFilters />
                    <AgentsGrid />
                </>
            ) : (
                <GlobalContextManager />
            )}
        </div>
    );
};

const Dashboard = () => (
    <DashboardProvider>
        <DashboardContent />
    </DashboardProvider>
);

export default Dashboard;
