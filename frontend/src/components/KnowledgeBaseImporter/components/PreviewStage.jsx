import React from 'react';
import { useImporter } from '../ImporterContext';
import { useImporterLogic } from '../hooks/useImporterLogic';

const PreviewStage = () => {
    const { previewItems, setPreviewItems } = useImporter();
    const { handleSaveBatch } = useImporterLogic();

    const toggleSelect = (idx) => {
        const next = [...previewItems];
        next[idx].selected = !next[idx].selected;
        setPreviewItems(next);
    };

    return (
        <div className="preview-stage">
            <h3>Revise os Itens Gerados</h3>
            <div className="preview-list">
                {previewItems.map((item, idx) => (
                    <div key={idx} className="preview-item">
                        <input 
                            type="checkbox" 
                            checked={!!item.selected} 
                            onChange={() => toggleSelect(idx)}
                        />
                        <div className="preview-content">
                            <strong>{item.question}</strong>
                            <p>{item.answer}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="preview-actions">
                <button 
                    onClick={() => handleSaveBatch(previewItems.filter(i => i.selected))} 
                    className="primary-btn"
                >
                    Salvar {previewItems.filter(i => i.selected).length} Itens
                </button>
            </div>
        </div>
    );
};

export default PreviewStage;
