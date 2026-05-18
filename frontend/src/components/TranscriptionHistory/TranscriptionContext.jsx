import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import { uploadManager } from '../../api/uploadManager';

const TranscriptionContext = createContext();

export const TranscriptionProvider = ({ children, onKnowledgeBaseUpdate }) => {
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [loading, setLoading] = useState(true);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [folders, setFolders] = useState([]);
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [activeUploads, setActiveUploads] = useState(uploadManager.getActiveUploads());
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // Modals visibility
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [isRagModalOpen, setIsRagModalOpen] = useState(false);
    const [taskForRag, setTaskForRag] = useState(null);
    const [isBatchRagModalOpen, setIsBatchRagModalOpen] = useState(false);
    const [selectedTaskForView, setSelectedTaskForView] = useState(null);
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [taskForTraining, setTaskForTraining] = useState(null);

    const tasksRef = useRef([]);
    const activeUploadsRef = useRef(uploadManager.getActiveUploads());

    useEffect(() => {
        const unsubscribe = uploadManager.subscribe((uploads) => {
            setActiveUploads(uploads);
            activeUploadsRef.current = uploads;
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const hasActiveUploads = activeUploadsRef.current.some(u => u.status === 'uploading');
            if (hasActiveUploads) {
                e.preventDefault();
                e.returnValue = 'Você tem uploads de arquivos em andamento. Se sair ou atualizar a página agora, os envios serão cancelados. Deseja realmente sair?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    const value = {
        tasks, setTasks, tasksRef,
        totalTasks, setTotalTasks,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        loading, setLoading,
        selectedFolderId, setSelectedFolderId,
        folders, setFolders,
        knowledgeBases, setKnowledgeBases,
        activeUploads, setActiveUploads, activeUploadsRef,
        isRefreshing, setIsRefreshing,
        selectedIds, setSelectedIds,
        selectedTask, setSelectedTask,
        taskToDelete, setTaskToDelete,
        showBulkDeleteModal, setShowBulkDeleteModal,
        showManualModal, setShowManualModal,
        isRagModalOpen, setIsRagModalOpen,
        taskForRag, setTaskForRag,
        isBatchRagModalOpen, setIsBatchRagModalOpen,
        selectedTaskForView, setSelectedTaskForView,
        isTrainingModalOpen, setIsTrainingModalOpen,
        taskForTraining, setTaskForTraining,
        onKnowledgeBaseUpdate
    };

    return <TranscriptionContext.Provider value={value}>{children}</TranscriptionContext.Provider>;
};

export const useTranscription = () => {
    const context = useContext(TranscriptionContext);
    if (!context) throw new Error('useTranscription must be used within a TranscriptionProvider');
    return context;
};
