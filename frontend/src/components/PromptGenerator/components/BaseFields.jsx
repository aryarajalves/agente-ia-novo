import React from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';
import { usePromptGeneratorActions } from '../hooks/usePromptGeneratorActions';

const BaseFields = () => {
    const { formData, setFormData, setMaximizedField, isGenerating } = usePromptGenerator();
    const { handleGenerate } = usePromptGeneratorActions();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const RenderField = ({ name, label, type, placeholder, rows }) => (
        <div className="form-group">
            <label>{label}</label>
            <div className="input-with-maximize">
                {type === 'textarea' ? (
                    <textarea
                        name={name}
                        placeholder={placeholder}
                        value={formData[name]}
                        onChange={handleInputChange}
                        rows={rows}
                    />
                ) : (
                    <input
                        name={name}
                        placeholder={placeholder}
                        value={formData[name]}
                        onChange={handleInputChange}
                    />
                )}
                <button
                    className="maximize-btn"
                    title="Maximizar"
                    onClick={() => setMaximizedField({ name, label })}
                >⤢</button>
            </div>
        </div>
    );

    return (
        <div className="panel left-panel">
            <h2 className="section-title">1. Defina as Bases</h2>
            <div className="form-container">
                <RenderField name="identity" label="Quem é o agente?" placeholder="Ex: Consultor Sênior de Vendas..." />
                <RenderField name="mission" label="Qual é a missão dele?" placeholder="Ex: Ajudar clientes..." type="textarea" rows={3} />
                <RenderField name="tone" label="Tom de Voz" placeholder="Ex: Empático, direto..." />
                <RenderField name="audience" label="Público Alvo" placeholder="Ex: Empreendedores iniciantes..." />
                <RenderField name="restrictions" label="Restrições" placeholder="Ex: Nunca falar preços..." type="textarea" rows={3} />
                
                <button
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={isGenerating || !formData.identity.trim() || !formData.mission.trim()}
                >
                    {isGenerating ? 'Criando Mágica... ✨' : 'Gerar Prompt Mestre 🚀'}
                </button>
            </div>
        </div>
    );
};

export default BaseFields;
