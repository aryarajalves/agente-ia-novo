import React, { createContext, useContext, useState } from 'react';

const QuestionsContext = createContext();

export const QuestionsProvider = ({ children }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState(null); // 'answer' | 'discard' | null
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [kbList, setKbList] = useState([]);
    const [agents, setAgents] = useState([]);
    const [publicToken, setPublicToken] = useState('');
    
    // Form States
    const [answerText, setAnswerText] = useState('');
    const [editingQuestionText, setEditingQuestionText] = useState('');
    const [selectedKbId, setSelectedKbId] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [teachMode, setTeachMode] = useState('rag'); // 'rag' | 'agent'
    const [saving, setSaving] = useState(false);

    const value = {
        questions, setQuestions,
        loading, setLoading,
        activeModal, setActiveModal,
        selectedQuestion, setSelectedQuestion,
        kbList, setKbList,
        agents, setAgents,
        publicToken, setPublicToken,
        answerText, setAnswerText,
        editingQuestionText, setEditingQuestionText,
        selectedKbId, setSelectedKbId,
        selectedAgentId, setSelectedAgentId,
        teachMode, setTeachMode,
        saving, setSaving
    };

    return <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>;
};

export const useQuestions = () => {
    const context = useContext(QuestionsContext);
    if (!context) throw new Error('useQuestions must be used within a QuestionsProvider');
    return context;
};
