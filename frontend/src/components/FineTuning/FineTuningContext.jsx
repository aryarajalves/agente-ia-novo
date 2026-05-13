import React, { createContext, useContext, useState } from 'react';

const FineTuningContext = createContext();

export const FineTuningProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('dataset');
    const [agents, setAgents] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [feedbackList, setFeedbackList] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [filterRating, setFilterRating] = useState('all');
    const [filterExported, setFilterExported] = useState('all');
    
    // UI State
    const [showStartModal, setShowStartModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const value = {
        activeTab, setActiveTab,
        agents, setAgents,
        selectedAgentId, setSelectedAgentId,
        feedbackList, setFeedbackList,
        jobs, setJobs,
        loading, setLoading,
        filterRating, setFilterRating,
        filterExported, setFilterExported,
        showStartModal, setShowStartModal,
        showGuide, setShowGuide,
        toast, showToast
    };

    return <FineTuningContext.Provider value={value}>{children}</FineTuningContext.Provider>;
};

export const useFineTuning = () => {
    const context = useContext(FineTuningContext);
    if (!context) throw new Error('useFineTuning must be used within a FineTuningProvider');
    return context;
};
