import React, { useState } from 'react';
import { useKB } from '../KBContext';
import ExpandableField from '../../ExpandableField';
import { useKBOperations } from '../hooks/useKBOperations';

const AddItemForm = () => {
    const { kbLabels, kbType } = useKB();
    const { handleAddItem } = useKBOperations();
    const [newPair, setNewPair] = useState({ question: '', answer: '', metadata_val: '', category: 'Geral' });

    if (kbType === 'product') return null;

    const onAdd = () => {
        handleAddItem(newPair);
        setNewPair({ question: '', answer: '', metadata_val: '', category: 'Geral' });
    };

    return (
        <div className="kb-add-card" style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '8px', height: '24px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
                <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>Novo Conhecimento</h4>
            </div>

            <div className="form-row-kb">
                <div className="form-group flex-2">
                    <ExpandableField
                        label={kbLabels.question}
                        placeholder={`Ex: ${kbLabels.question === 'Pergunta' ? 'Qual o horário de funcionamento?' : 'Digite aqui...'}`}
                        value={newPair.question}
                        onChange={(e) => setNewPair({ ...newPair, question: e.target.value })}
                    />
                </div>
                <div className="form-group flex-2">
                    <ExpandableField
                        label={kbLabels.metadata}
                        placeholder={`Ex: ${kbLabels.metadata === 'Metadado' ? 'PAINEL INICIAL | Chat' : 'Digite aqui...'}`}
                        value={newPair.metadata_val}
                        onChange={(e) => setNewPair({ ...newPair, metadata_val: e.target.value })}
                    />
                </div>
                <div className="form-group flex-1">
                    <label>Categoria</label>
                    <input
                        type="text"
                        value={newPair.category}
                        onChange={e => setNewPair({ ...newPair, category: e.target.value })}
                        placeholder="Geral, Preços, etc."
                    />
                </div>
            </div>
            <div className="form-group">
                <ExpandableField
                    label={kbLabels.answer}
                    type="textarea"
                    placeholder={`Ex: ${kbLabels.answer === 'Resposta' ? 'O horário é...' : 'Digite o conteúdo...'}`}
                    value={newPair.answer}
                    onChange={(e) => setNewPair({ ...newPair, answer: e.target.value })}
                    style={{ minHeight: '120px' }}
                />
            </div>

            <button onClick={onAdd} className="create-agent-btn" style={{ width: '100%', border: 'none' }}>
                ✓ Adicionar à Base
            </button>
        </div>
    );
};

export default AddItemForm;
