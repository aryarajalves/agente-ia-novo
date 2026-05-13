import React from 'react';
import { ImporterProvider, useImporter } from './ImporterContext';
import ConfigStage from './components/ConfigStage';
import PreviewStage from './components/PreviewStage';
import './styles/KnowledgeBaseImporter.css';

const ImporterContent = () => {
    const { stage, loading, progress, error, onCancel, importStats, onComplete } = useImporter();

    if (loading) {
        return <div className="importer-loading">Processando... {progress}%</div>;
    }

    if (stage === 'success') {
        return (
            <div className="importer-success">
                <h3>🎉 Importação Concluída!</h3>
                <p>{importStats.added} itens adicionados.</p>
                <button onClick={onComplete} className="primary-btn">Voltar para a Base</button>
            </div>
        );
    }

    return (
        <div className="kb-importer-overlay">
            <div className="kb-importer-modal">
                <button onClick={onCancel} className="close-btn">✕</button>
                {error && <div className="error-banner">{error}</div>}
                
                {stage === 'config' && <ConfigStage />}
                {stage === 'preview' && <PreviewStage />}
            </div>
        </div>
    );
};

const KnowledgeBaseImporter = (props) => (
    <ImporterProvider initialProps={props}>
        <ImporterContent />
    </ImporterProvider>
);

export default KnowledgeBaseImporter;
