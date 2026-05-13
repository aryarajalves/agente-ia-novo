import React from 'react';
import { FineTuningProvider, useFineTuning } from './FineTuningContext';
import { useFineTuningData } from './hooks/useFineTuningData';
import StatsRow from './components/StatsRow';
import FeedbackList from './components/FeedbackList';
import './styles/FineTuning.css';

const ManagerContent = () => {
    const { activeTab, setActiveTab, agents, selectedAgentId, setSelectedAgentId, showGuide, setShowGuide, toast } = useFineTuning();
    useFineTuningData();

    return (
        <div className="fine-tuning-page fade-in">
            {toast && <div className={`ft-toast ${toast.type}`}>{toast.msg}</div>}

            <header className="page-header">
                <div className="header-left">
                    <div className="header-icon">🏭</div>
                    <div>
                        <h1 className="page-title">Pipeline de Fine-Tuning</h1>
                        <p className="page-subtitle">Treine modelos proprietários com o estilo da sua empresa</p>
                    </div>
                </div>
                <button onClick={() => setShowGuide(true)} className="guide-btn">📖 Guia do Fine-Tuning</button>
            </header>

            <div className="ft-controls-bar">
                <div className="agent-filter">
                    <label>Agente:</label>
                    <select value={selectedAgentId || ''} onChange={e => setSelectedAgentId(Number(e.target.value))}>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="tab-pills">
                    <button className={`tab-pill ${activeTab === 'dataset' ? 'active' : ''}`} onClick={() => setActiveTab('dataset')}>📋 Dataset</button>
                    <button className={`tab-pill ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>🚀 Jobs</button>
                </div>
            </div>

            {activeTab === 'dataset' && (
                <>
                    <StatsRow />
                    <FeedbackList />
                </>
            )}

            {activeTab === 'jobs' && (
                <div className="ft-jobs-section">
                    <h3>Jobs de Treinamento na OpenAI</h3>
                    {/* JobTable would go here */}
                </div>
            )}
        </div>
    );
};

const FineTuning = () => (
    <FineTuningProvider>
        <ManagerContent />
    </FineTuningProvider>
);

export default FineTuning;
