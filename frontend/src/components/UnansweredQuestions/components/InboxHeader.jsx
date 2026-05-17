import React, { useState } from 'react';
import { useQuestions } from '../QuestionsContext';

const InboxHeader = ({ onRefresh }) => {
    const { questions, loading, selectedIds, setSelectedIds, setActiveModal } = useQuestions();

    const isAllSelected = questions.length > 0 && questions.every(q => selectedIds.has(q.id));

    const handleSelectAllChange = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            questions.forEach(q => newSelected.add(q.id));
            setSelectedIds(newSelected);
        }
    };

    return (
        <div className="inbox-header">
            <div className="header-left">
                <div className="header-icon">📥</div>
                <div>
                    <h3>Inbox de Dúvidas</h3>
                    <p>{loading ? 'Carregando...' : `${questions.length} pendentes`}</p>
                </div>
            </div>
            
            {questions.length > 0 && (
                <div className="header-select-all">
                    <label className="uq-checkbox-label select-all-label">
                        <input 
                            type="checkbox" 
                            checked={isAllSelected} 
                            onChange={handleSelectAllChange} 
                            className="uq-custom-checkbox"
                        />
                        <span className="checkbox-text">Selecionar Todas</span>
                    </label>
                    {selectedIds.size > 0 && (
                        <span className="selected-count-badge">
                            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            <div className="header-actions">
                {selectedIds.size > 0 && (
                    <button onClick={() => setActiveModal('bulk_discard')} className="btn-bulk-discard">
                        🗑️ Descartar Selecionadas
                    </button>
                )}
                <button onClick={onRefresh} className="btn-refresh-new">
                    <span className="icon">🔄</span> Atualizar
                </button>
            </div>
        </div>
    );
};

export default InboxHeader;
