import React from 'react';
import { useImporter } from '../ImporterContext';
import { useImporterLogic } from '../hooks/useImporterLogic';

const ConfigStage = () => {
    const { file, url, pastedText, smartConfig, setSmartConfig } = useImporter();
    const { handleGeneratePreview } = useImporterLogic();

    const isPdf = file?.name?.toLowerCase().endsWith('.pdf');
    const isUrl = !!url;
    const isText = !!pastedText;

    return (
        <div className="config-stage">
            <h3>Configuração da Importação</h3>
            {isPdf && (
                <div className="config-card">
                    <label>Páginas do PDF</label>
                    <input 
                        type="number" 
                        value={smartConfig.startPage} 
                        onChange={e => setSmartConfig({...smartConfig, startPage: parseInt(e.target.value)})}
                    />
                </div>
            )}
            {isUrl && <div className="config-card">URL: {url}</div>}
            
            <div className="config-actions">
                <button onClick={handleGeneratePreview} className="primary-btn">Gerar Prévia com IA</button>
            </div>
        </div>
    );
};

export default ConfigStage;
