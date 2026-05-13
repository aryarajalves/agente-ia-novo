import React from 'react';
import { useTools } from '../ToolsContext';
import { useToolsActions } from '../hooks/useToolsActions';

const ToolEditor = () => {
    const { newTool, setNewTool, parameters, setParameters, editingTool } = useTools();
    const { handleSave } = useToolsActions();

    const addParam = () => setParameters([...parameters, { name: '', type: 'string', description: '', required: false, binding: '' }]);

    return (
        <div className="tool-editor-card">
            <h3>{editingTool ? 'Editar Ferramenta' : 'Nova Ferramenta'}</h3>
            <div className="form-group">
                <label>Nome Técnico (snake_case)</label>
                <input 
                    type="text" 
                    value={newTool.name} 
                    onChange={e => setNewTool({...newTool, name: e.target.value})} 
                />
            </div>
            <div className="form-group">
                <label>Descrição para a IA</label>
                <textarea 
                    value={newTool.description} 
                    onChange={e => setNewTool({...newTool, description: e.target.value})} 
                />
            </div>

            <div className="parameters-section">
                <h4>Parâmetros de Entrada</h4>
                {parameters.map((p, idx) => (
                    <div key={idx} className="param-row">
                        <input placeholder="Nome" value={p.name} onChange={e => {
                            const next = [...parameters];
                            next[idx].name = e.target.value;
                            setParameters(next);
                        }} />
                    </div>
                ))}
                <button onClick={addParam} className="add-btn">+ Parâmetro</button>
            </div>

            <button onClick={handleSave} className="primary-btn">Salvar Habilidade</button>
        </div>
    );
};

export default ToolEditor;
