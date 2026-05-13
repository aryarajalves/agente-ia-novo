import React from 'react';
import { ToolsProvider, useTools } from './ToolsContext';
import { useToolsData } from './hooks/useToolsData';
import ToolEditor from './components/ToolEditor';
import ToolsList from './components/ToolsList';
import './styles/ToolsManager.css';

const ManagerContent = ({ standalone }) => {
    const { status, setShowGuide } = useTools();
    useToolsData();

    return (
        <div className="tools-manager-container">
            <header className="panel-header">
                <h2>{standalone ? 'Gerenciador de Habilidades (API)' : 'Configurar Habilidades'}</h2>
                <button onClick={() => setShowGuide(true)} className="guide-btn">📖 Guia das Ferramentas</button>
            </header>

            {status && <div className="status-banner">{status}</div>}

            <div className="manager-layout">
                <ToolEditor />
                <div className="list-section">
                    <h4>Ferramentas Cadastradas</h4>
                    <ToolsList />
                </div>
            </div>
        </div>
    );
};

const ToolsManager = (props) => (
    <ToolsProvider>
        <ManagerContent {...props} />
    </ToolsProvider>
);

export default ToolsManager;
