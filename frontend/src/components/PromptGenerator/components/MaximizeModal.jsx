import React from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';

const MaximizeModal = () => {
    const { maximizedField, setMaximizedField, formData, setFormData, chatInput, setChatInput } = usePromptGenerator();

    if (!maximizedField) return null;

    const currentValue = maximizedField.name === 'chatInput' ? chatInput :
                        maximizedField.value !== undefined ? maximizedField.value :
                        formData[maximizedField.name];

    const handleChange = (e) => {
        if (maximizedField.isReadOnly) return;
        if (maximizedField.name === 'chatInput') {
            setChatInput(e.target.value);
        } else {
            setFormData(prev => ({ ...prev, [maximizedField.name]: e.target.value }));
        }
    };

    return (
        <div className="maximize-overlay" onClick={() => setMaximizedField(null)}>
            <div className="maximize-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{maximizedField.label}</h3>
                    <button className="close-modal-btn" onClick={() => setMaximizedField(null)}>✕</button>
                </div>
                <textarea
                    className="maximized-textarea"
                    value={currentValue}
                    onChange={handleChange}
                    readOnly={maximizedField.isReadOnly}
                    autoFocus
                />
                <div className="modal-footer">
                    <button className="btn-confirm" onClick={() => setMaximizedField(null)}>Salvar e Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default MaximizeModal;
