import React, { createContext, useContext, useState } from 'react';

const ToolsContext = createContext();

export const ToolsProvider = ({ children }) => {
    const [tools, setTools] = useState([]);
    const [globalVariables, setGlobalVariables] = useState([]);
    const [availableLabels, setAvailableLabels] = useState([]);
    
    // Editor State
    const [editingTool, setEditingTool] = useState(null);
    const [newTool, setNewTool] = useState({ name: '', description: '', webhook_url: '' });
    const [parameters, setParameters] = useState([]);
    
    // Chatwoot Labels State
    const [selectedLabelsToAdd, setSelectedLabelsToAdd] = useState({});
    const [selectedLabelsToRemove, setSelectedLabelsToRemove] = useState({});
    const [toolConfirmationMessages, setToolConfirmationMessages] = useState({});

    // Modals & UI
    const [status, setStatus] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [logsModal, setLogsModal] = useState({ open: false, tool: null, logs: [], loading: false, page: 1 });

    const value = {
        tools, setTools,
        globalVariables, setGlobalVariables,
        availableLabels, setAvailableLabels,
        editingTool, setEditingTool,
        newTool, setNewTool,
        parameters, setParameters,
        selectedLabelsToAdd, setSelectedLabelsToAdd,
        selectedLabelsToRemove, setSelectedLabelsToRemove,
        toolConfirmationMessages, setToolConfirmationMessages,
        status, setStatus,
        showGuide, setShowGuide,
        logsModal, setLogsModal
    };

    return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
};

export const useTools = () => {
    const context = useContext(ToolsContext);
    if (!context) throw new Error('useTools must be used within a ToolsProvider');
    return context;
};
