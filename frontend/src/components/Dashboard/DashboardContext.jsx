import React, { createContext, useContext, useState } from 'react';

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
    const [agents, setAgents] = useState([]);
    const [filteredAgents, setFilteredAgents] = useState([]);
    const [kbList, setKbList] = useState([]);
    const [stats, setStats] = useState({ total_agents: 0, total_knowledge_bases: 0, total_interactions: 0, total_cost: 0.0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [activeTab, setActiveTab] = useState('agents');
    const [selectedAgents, setSelectedAgents] = useState(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // Search & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [modelFilter, setModelFilter] = useState('');

    const toggleSelectAll = () => {
        if (selectedAgents.size === filteredAgents.length) {
            setSelectedAgents(new Set());
        } else {
            setSelectedAgents(new Set(filteredAgents.map(a => a.id)));
        }
    };

    const value = {
        agents, setAgents,
        filteredAgents, setFilteredAgents,
        kbList, setKbList,
        stats, setStats,
        loading, setLoading,
        error, setError,
        activeTab, setActiveTab,
        selectedAgents, setSelectedAgents,
        selectionMode, setSelectionMode,
        searchTerm, setSearchTerm,
        modelFilter, setModelFilter,
        toggleSelectAll
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
    return context;
};
