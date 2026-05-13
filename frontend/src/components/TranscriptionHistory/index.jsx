import React from 'react';
import { TranscriptionProvider } from './TranscriptionContext';
import Header from './components/Header';
import FolderManager from './components/FolderManager';
import TasksTable from './components/TasksTable';
import './styles/TranscriptionHistory.css';

const HistoryContent = () => {
    return (
        <div className="transcription-history">
            <Header />
            <FolderManager />
            <TasksTable />
            {/* Adicionar UploadStatus e Modals aqui */}
        </div>
    );
};

const TranscriptionHistory = ({ onKnowledgeBaseUpdate }) => {
    return (
        <TranscriptionProvider onKnowledgeBaseUpdate={onKnowledgeBaseUpdate}>
            <HistoryContent />
        </TranscriptionProvider>
    );
};

export default TranscriptionHistory;
