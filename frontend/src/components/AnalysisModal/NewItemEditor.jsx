import React from 'react';

const NewItemEditor = ({
    newItemData,
    setNewItemData,
    knowledgeBases,
    onSave,
    onCancel,
    isSaving
}) => {
    return (
        <div className="overlay-editor fade-in">
            <div className="editor-card">
                <h4>✨ Adicionar à Base</h4>
                <div className="field">
                    <label>Pergunta</label>
                    <input
                        value={newItemData.question}
                        onChange={e => setNewItemData({ ...newItemData, question: e.target.value })}
                    />
                </div>
                <div className="field">
                    <label>Resposta Ideal</label>
                    <textarea
                        autoFocus
                        value={newItemData.answer}
                        onChange={e => setNewItemData({ ...newItemData, answer: e.target.value })}
                        placeholder="Escreva a resposta correta..."
                    />
                </div>
                <div className="field">
                    <label>Base de Destino</label>
                    <select
                        value={newItemData.target_kb_id}
                        onChange={e => setNewItemData({ ...newItemData, target_kb_id: e.target.value })}
                    >
                        {knowledgeBases.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
                    </select>
                </div>
                <div className="actions">
                    <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
                    <button className="btn-save" onClick={onSave} disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Conhecimento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewItemEditor;
