import React from 'react';

const CorrectionModal = ({
    correctionModal,
    setCorrectionModal,
    correctionText,
    setCorrectionText,
    correctionNote,
    setCorrectionNote,
    saveCorrection,
    savingFeedback,
    setFeedbackState
}) => {
    if (!correctionModal) return null;

    return (
        <div className="modal-overlay fade-in" onClick={e => { if (e.target === e.currentTarget) setCorrectionModal(null); }}>
            <div className="modal-content correction-modal">
                <div className="modal-header">
                    <div className="icon-badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>✏️</div>
                    <div className="header-text">
                        <h3>Corrigir Resposta</h3>
                        <p className="subtitle">Esta correção será usada para treinar o modelo</p>
                    </div>
                    <button className="close-btn-top-right" onClick={() => {
                        const idx = correctionModal.msgIndex;
                        setCorrectionModal(null);
                        setFeedbackState(prev => { const n = { ...prev }; delete n[idx]; return n; });
                    }}>✕</button>
                </div>
                <div className="modal-body-scroll">
                    <div className="correction-context">
                        <div className="cx-row">
                            <label>💬 Pergunta do usuário</label>
                            <div className="cx-value user">{correctionModal.userMsg || '(contexto não disponível)'}</div>
                        </div>
                        <div className="cx-row">
                            <label>🤖 Resposta original (ruim)</label>
                            <div className="cx-value original">{correctionModal.msg.content}</div>
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>✅ Resposta ideal <span style={{ color: '#f43f5e' }}>*</span></label>
                        <textarea
                            placeholder="Digite aqui como o agente deveria ter respondido..."
                            value={correctionText}
                            onChange={e => setCorrectionText(e.target.value)}
                            style={{ minHeight: '120px' }}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>💡 Nota para o revisor (opcional)</label>
                        <input
                            type="text"
                            placeholder="Ex: 'Sempre mencionar o desconto anual primeiro'"
                            value={correctionNote}
                            onChange={e => setCorrectionNote(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="cancel-btn" onClick={() => {
                        const idx = correctionModal.msgIndex;
                        setCorrectionModal(null);
                        setFeedbackState(prev => { const n = { ...prev }; delete n[idx]; return n; });
                    }}>Cancelar</button>
                    <button
                        className="primary-action-btn"
                        onClick={saveCorrection}
                        disabled={savingFeedback || !correctionText.trim()}
                    >
                        {savingFeedback ? '⏳ Salvando...' : '🎯 Salvar Correção no Dataset'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CorrectionModal;
