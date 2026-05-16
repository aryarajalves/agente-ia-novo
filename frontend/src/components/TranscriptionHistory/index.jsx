import React from 'react';
import { TranscriptionProvider } from './TranscriptionContext';
import Header from './components/Header';
import FolderManager from './components/FolderManager';
import TasksTable from './components/TasksTable';
import ManualTranscriptionModal from './components/ManualTranscriptionModal';
import BulkDeleteModal from './components/BulkDeleteModal';
import RagBatchModal from './components/RagBatchModal';
import './styles/TranscriptionHistory.css';

const HistoryContent = () => {
    return (
        <div className="transcription-history">
            <Header />
            <FolderManager />
            <TasksTable />
            
            {/* Modals */}
            <ManualTranscriptionModal />
            <BulkDeleteModal />
            <RagBatchModal />
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
