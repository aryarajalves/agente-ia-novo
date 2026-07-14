import React, { useState } from 'react';
import { KBProvider } from './KBContext';
import './styles/KnowledgeBaseManager.css';
import Header from './components/Header';
import QuickActions from './components/QuickActions';
import AddItemForm from './components/AddItemForm';
import SimulatorBlock from './components/SimulatorBlock';
import KBTable from './components/KBTable';
import Modals from './components/Modals';
import KnowledgeBaseImporter from '../KnowledgeBaseImporter/index';
import { useKB } from './KBContext';

const TABS = [
    { id: 'add', icon: '➕', label: 'Adicionar Conteúdo' },
    { id: 'simulate', icon: '🧪', label: 'Simulador RAG' },
    { id: 'items', icon: '📋', label: 'Itens da Base' }
];

const KBManagerContent = () => {
    const { showImporter, setShowImporter, kbType, kbId, setPendingFile } = useKB();
    const [activeTab, setActiveTab] = useState('add');

    if (showImporter) {
        return (
            <KnowledgeBaseImporter
                kbType={kbType}
                kbId={kbId}
                onCancel={() => setShowImporter(false)}
                onComplete={() => setShowImporter(false)}
            />
        );
    }

    return (
        <div className="kb-manager">
            <Header />

            <div className="kb-manager-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`kb-manager-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <div className="kb-content">
                {activeTab === 'add' && (
                    <>
                        <QuickActions />
                        <AddItemForm />
                    </>
                )}
                {activeTab === 'simulate' && <SimulatorBlock />}
                {activeTab === 'items' && <KBTable />}
                <Modals />
            </div>
        </div>
    );
};

const KnowledgeBaseManager = (props) => (
    <KBProvider 
        initialKB={props.knowledgeBase}
        kbId={props.kbId}
        kbType={props.kbType}
        onAdd={props.onAdd}
        onDelete={props.onDelete}
        onUpdate={props.onUpdate}
        onChange={props.onChange}
    >
        <KBManagerContent />
    </KBProvider>
);

export default KnowledgeBaseManager;
