import React from 'react';
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

const KBManagerContent = () => {
    const { showImporter, setShowImporter, kbType, kbId, setPendingFile } = useKB();

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
            <div className="kb-content">
                <QuickActions />
                <AddItemForm />
                <SimulatorBlock />
                <KBTable />
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
