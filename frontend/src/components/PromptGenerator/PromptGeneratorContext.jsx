import React, { createContext, useContext, useState } from 'react';

const PromptGeneratorContext = createContext();

export const PromptGeneratorProvider = ({ children }) => {
    const [formData, setFormData] = useState({
        identity: '',
        mission: '',
        tone: '',
        restrictions: '',
        audience: ''
    });
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Maximized State
    const [maximizedField, setMaximizedField] = useState(null);
    
    // Publish States
    const [agents, setAgents] = useState([]);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Chat States
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isTalkingToAI, setIsTalkingToAI] = useState(false);

    const value = {
        formData, setFormData,
        generatedPrompt, setGeneratedPrompt,
        isGenerating, setIsGenerating,
        maximizedField, setMaximizedField,
        agents, setAgents,
        showPublishModal, setShowPublishModal,
        selectedAgentId, setSelectedAgentId,
        isPublishing, setIsPublishing,
        searchTerm, setSearchTerm,
        chatMessages, setChatMessages,
        chatInput, setChatInput,
        isTalkingToAI, setIsTalkingToAI
    };

    return <PromptGeneratorContext.Provider value={value}>{children}</PromptGeneratorContext.Provider>;
};

export const usePromptGenerator = () => {
    const context = useContext(PromptGeneratorContext);
    if (!context) throw new Error('usePromptGenerator must be used within a PromptGeneratorProvider');
    return context;
};
