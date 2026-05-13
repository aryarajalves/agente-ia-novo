import React, { createContext, useContext, useState } from 'react';

const SupportContext = createContext();

export const SupportProvider = ({ children }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Public Token
    const [publicToken, setPublicToken] = useState('');
    const [newTokenValue, setNewTokenValue] = useState('');
    const [isEditingToken, setIsEditingToken] = useState(false);
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    // Modals visibility
    const [showGuide, setShowGuide] = useState(false);
    const [configModal, setConfigModal] = useState(false);
    const [webhookModal, setWebhookModal] = useState(false);
    const [chatModal, setChatModal] = useState(null);
    const [errorLogsModal, setErrorLogsModal] = useState(null);
    const [confirmResolve, setConfirmResolve] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [batchConfirmResolve, setBatchConfirmResolve] = useState(false);
    const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);

    const value = {
        requests, setRequests,
        loading, setLoading,
        selectedIds, setSelectedIds,
        publicToken, setPublicToken,
        newTokenValue, setNewTokenValue,
        isEditingToken, setIsEditingToken,
        showCopySuccess, setShowCopySuccess,
        showGuide, setShowGuide,
        configModal, setConfigModal,
        webhookModal, setWebhookModal,
        chatModal, setChatModal,
        errorLogsModal, setErrorLogsModal,
        confirmResolve, setConfirmResolve,
        confirmDelete, setConfirmDelete,
        batchConfirmResolve, setBatchConfirmResolve,
        batchConfirmDelete, setBatchConfirmDelete
    };

    return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};

export const useSupport = () => {
    const context = useContext(SupportContext);
    if (!context) throw new Error('useSupport must be used within a SupportProvider');
    return context;
};
