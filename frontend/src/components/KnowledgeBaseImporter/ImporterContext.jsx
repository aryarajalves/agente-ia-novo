import React, { createContext, useContext, useState } from 'react';

const ImporterContext = createContext();

export const ImporterProvider = ({ children, initialProps }) => {
    const { kbId, kbType, onCancel, onComplete } = initialProps;

    const [stage, setStage] = useState('config');
    const [file, setFile] = useState(initialProps.initialFile || null);
    const [url, setUrl] = useState(initialProps.initialUrl || '');
    const [pastedText, setPastedText] = useState(initialProps.initialText || '');
    
    const [smartConfig, setSmartConfig] = useState({
        startPage: 1,
        endPage: null,
        chunkSize: 1000,
        useAI: true,
        qaCount: 2,
        mode: 'global',
        userSuggestions: '',
        globalQaCount: 10,
        qaPerSection: 8,
        useVision: false,
        extractionType: 'suggestions',
        model: 'gpt-4o-mini'
    });

    const [columns, setColumns] = useState([]);
    const [mapping, setMapping] = useState({
        question: '',
        answer: '',
        metadata_val: '',
        category: '',
    });

    const [previewItems, setPreviewItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [importStats, setImportStats] = useState({ added: 0, updated: 0 });

    const value = {
        kbId, kbType, onCancel, onComplete,
        stage, setStage,
        file, setFile,
        url, setUrl,
        pastedText, setPastedText,
        smartConfig, setSmartConfig,
        columns, setColumns,
        mapping, setMapping,
        previewItems, setPreviewItems,
        loading, setLoading,
        progress, setProgress,
        error, setError,
        importStats, setImportStats
    };

    return <ImporterContext.Provider value={value}>{children}</ImporterContext.Provider>;
};

export const useImporter = () => {
    const context = useContext(ImporterContext);
    if (!context) throw new Error('useImporter must be used within an ImporterProvider');
    return context;
};
