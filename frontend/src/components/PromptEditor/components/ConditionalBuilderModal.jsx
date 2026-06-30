import React from 'react';
import ReactDOM from 'react-dom';

/**
 * ConditionalBuilderModal
 * Modal visual do construtor de condicionais.
 * Suporta dois modos:
 *   - Inserção (editMode=false): botão "✨ Inserir no Prompt"
 *   - Edição (editMode=true): botão "✅ Atualizar Condicional" com header diferente
 */
const ConditionalBuilderModal = ({
    show,
    onClose,
    onSave,
    onDelete,
    editMode = false,
    builder,
    globalVarsList = [],
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [simulatedValues, setSimulatedValues] = React.useState({});

    React.useEffect(() => {
        if (!show) {
            setShowDeleteConfirm(false);
        }
    }, [show]);

    if (!show) return null;

    const {
        selectedVar, setSelectedVar,
        condOperator, setCondOperator,
        condValue, setCondValue,
        addAndCondition, setAddAndCondition,
        andVar, setAndVar,
        andOperator, setAndOperator,
        andValue, setAndValue,
        condTrueText, setCondTrueText,
        condFalseText, setCondFalseText,
        elifsList,
        condTitle, setCondTitle,
        handleStartConfigure,
        handleAddElif,
        handleRemoveElif,
        handleUpdateElif,
        renderValueInput,
        getGeneratedSnippet,
        temporalVars,
        allVars,
    } = builder;

    const getUsedVars = () => {
        const vars = new Set();
        if (selectedVar) vars.add(selectedVar);
        if (addAndCondition && andVar) vars.add(andVar);
        if (elifsList) {
            elifsList.forEach(elif => {
                if (elif.variable) vars.add(elif.variable);
            });
        }
        return Array.from(vars);
    };

    const evaluateComparison = (varVal, op, targetVal) => {
        if (varVal === undefined || varVal === null) varVal = '';
        if (targetVal === undefined || targetVal === null) targetVal = '';
        
        const trimmedVal = String(varVal).trim();
        const trimmedTarget = String(targetVal).trim();

        const isNumVal = !isNaN(trimmedVal) && trimmedVal !== '';
        const isNumTarget = !isNaN(trimmedTarget) && trimmedTarget !== '';
        
        if (isNumVal && isNumTarget) {
            const nVal = Number(trimmedVal);
            const nTarget = Number(trimmedTarget);
            switch (op) {
                case '==': return nVal === nTarget;
                case '!=': return nVal !== nTarget;
                case '>': return nVal > nTarget;
                case '<': return nVal < nTarget;
                case '>=': return nVal >= nTarget;
                case '<=': return nVal <= nTarget;
                default: return false;
            }
        }
        
        switch (op) {
            case '==': return trimmedVal.toLowerCase() === trimmedTarget.toLowerCase();
            case '!=': return trimmedVal.toLowerCase() !== trimmedTarget.toLowerCase();
            case '>': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) > 0;
            case '<': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) < 0;
            case '>=': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) >= 0;
            case '<=': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) <= 0;
            default: return false;
        }
    };

    const getEvaluationResult = () => {
        if (!selectedVar) return '';
        
        const mainVal = simulatedValues[selectedVar] || '';
        let mainPassed = evaluateComparison(mainVal, condOperator, condValue);
        
        if (addAndCondition && andVar) {
            const andValComputed = simulatedValues[andVar] || '';
            const andPassed = evaluateComparison(andValComputed, andOperator, andValue);
            mainPassed = mainPassed && andPassed;
        }
        
        if (mainPassed) {
            return condTrueText || '(Texto de retorno vazio)';
        }
        
        if (elifsList && elifsList.length > 0) {
            for (const elif of elifsList) {
                if (elif.variable) {
                    const elifVal = simulatedValues[elif.variable] || '';
                    const elifPassed = evaluateComparison(elifVal, elif.operator, elif.value);
                    if (elifPassed) {
                        return elif.trueText || '(Texto de retorno vazio)';
                    }
                }
            }
        }
        
        return condFalseText || '(Texto de retorno vazio)';
    };

    const usedVars = getUsedVars();

    return ReactDOM.createPortal(
        <div className="cond-modal-overlay fade-in">
            <div className={`cond-modal-card ${selectedVar ? 'configuring' : ''} ${editMode ? 'edit-mode' : ''}`}>
                <header className="modal-header">
                    {editMode ? (
                        <h3>✏️ {selectedVar ? 'Editando Condicional' : 'Selecione a Variável'}</h3>
                    ) : (
                        <h3>🔀 {selectedVar ? 'Configurar Condicional' : 'Assistente de Condicionais'}</h3>
                    )}
                    {editMode && !selectedVar && (
                        <span className="edit-mode-badge">Modo Edição</span>
                    )}
                </header>

                <div className="modal-body custom-scrollbar">
                    {!selectedVar ? (
                        <>
                            {/* Seção 1: Variáveis do Sistema */}
                            <section>
                                <h4 className="modal-section-title">📂 Variáveis Globais (Cadastradas no Sistema)</h4>
                                <div className="variables-list-box custom-scrollbar">
                                    {globalVarsList && globalVarsList.length > 0 ? (
                                        globalVarsList.map((v) => (
                                            <div
                                                key={v.id}
                                                className="var-row-item"
                                                onClick={() => handleStartConfigure(v.key)}
                                                title={`Clique para configurar condicional para {${v.key}}`}
                                            >
                                                <div className="var-row-info">
                                                    <span className="var-row-badge">{v.key}</span>
                                                    <span className="var-row-desc">{v.description || 'Variável do sistema de contexto.'}</span>
                                                </div>
                                                <span className="click-to-insert-hint">⚙️ Configurar</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.5rem 0' }}>
                                            Nenhuma variável global encontrada. Cadastre variáveis na aba de variáveis globais do sistema.
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* Seção 2: Consciência Temporal */}
                            <section>
                                <h4 className="modal-section-title">⏱️ Variáveis Temporais (Consciência Temporal)</h4>
                                <div className="variables-list-box custom-scrollbar">
                                    {temporalVars.map((v) => (
                                        <div
                                            key={v.key}
                                            className="var-row-item"
                                            onClick={() => handleStartConfigure(v.key)}
                                            title={`Clique para configurar condicional para {${v.key}}`}
                                        >
                                            <div className="var-row-info">
                                                <span
                                                    className="var-row-badge"
                                                    style={{
                                                        color: '#818cf8',
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        borderColor: 'rgba(99, 102, 241, 0.2)',
                                                    }}
                                                >
                                                    {v.key}
                                                </span>
                                                <span className="var-row-desc">{v.desc}</span>
                                            </div>
                                            <span className="click-to-insert-hint" style={{ color: '#818cf8' }}>
                                                ⚙️ Configurar
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className="interactive-configurer fade-in">
                            <div className="configurer-header-info">
                                <span className="current-var-badge">Variável Principal: {selectedVar}</span>
                            </div>

                            <div className="form-group-block" style={{ marginBottom: '1.25rem' }}>
                                <label htmlFor="cond-title-input" className="input-block-label">
                                    🏷️ Título / Comentário da Condicional (Texto após o #)
                                </label>
                                <input
                                    id="cond-title-input"
                                    type="text"
                                    value={condTitle}
                                    onChange={(e) => setCondTitle(e.target.value)}
                                    placeholder="Ex: Condicional de data_atual..."
                                    className="cond-custom-input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div className="cond-config-row">
                                <div className="form-group-inline">
                                    <label>Operador</label>
                                    <select
                                        value={condOperator}
                                        onChange={(e) => setCondOperator(e.target.value)}
                                        className="cond-custom-select"
                                    >
                                        <option value="==">== (Igual)</option>
                                        <option value="!=">!= (Diferente)</option>
                                        <option value=">">&gt; (Maior)</option>
                                        <option value="<">&lt; (Menor)</option>
                                        <option value=">=">&gt;= (Maior ou igual)</option>
                                        <option value="<=">&lt;= (Menor ou igual)</option>
                                    </select>
                                </div>

                                <div className="form-group-inline flex-grow">
                                    <label>Valor de Comparação (Opcional se for verificar existência)</label>
                                    {renderValueInput(selectedVar, condValue, setCondValue, 'cond-main-value-input')}
                                </div>
                            </div>

                            {/* AND opcional */}
                            <div className="and-toggle-container">
                                <label className="checkbox-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={addAndCondition}
                                        onChange={(e) => setAddAndCondition(e.target.checked)}
                                        className="cond-checkbox"
                                    />
                                    <span className="checkbox-custom-text">➕ Adicionar Condição AND (&&)</span>
                                </label>
                            </div>

                            {addAndCondition && (
                                <div className="and-configurer-block slide-down">
                                    <h5 className="sub-config-title">Conectar via AND com:</h5>
                                    <div className="cond-config-row">
                                        <div className="form-group-inline">
                                            <label>Segunda Variável</label>
                                            <select
                                                value={andVar}
                                                onChange={(e) => setAndVar(e.target.value)}
                                                className="cond-custom-select"
                                            >
                                                <option value="">Selecione...</option>
                                                {allVars.map((v) => (
                                                    <option key={v.key || v.id} value={v.key}>
                                                        {v.key}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group-inline">
                                            <label>Operador</label>
                                            <select
                                                value={andOperator}
                                                onChange={(e) => setAndOperator(e.target.value)}
                                                className="cond-custom-select"
                                            >
                                                <option value="==">== (Igual)</option>
                                                <option value="!=">!= (Diferente)</option>
                                                <option value=">">&gt; (Maior)</option>
                                                <option value="<">&lt; (Menor)</option>
                                                <option value=">=">&gt;= (Maior ou igual)</option>
                                                <option value="<=">&lt;= (Menor ou igual)</option>
                                            </select>
                                        </div>

                                        <div className="form-group-inline flex-grow">
                                            <label>Valor</label>
                                            {andVar ? (
                                                renderValueInput(andVar, andValue, setAndValue, 'cond-and-value-input')
                                            ) : (
                                                <input
                                                    type="text"
                                                    disabled
                                                    placeholder="Selecione a variável..."
                                                    className="cond-custom-input disabled"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Texto verdadeiro (IF) */}
                            <div className="form-group-block" style={{ marginTop: '1.25rem' }}>
                                <label htmlFor="cond-true-text-input" className="input-block-label">
                                    💬 Resposta se a Condição Principal for Verdadeira
                                </label>
                                <textarea
                                    id="cond-true-text-input"
                                    value={condTrueText}
                                    onChange={(e) => setCondTrueText(e.target.value)}
                                    placeholder="Digite a resposta do bot aqui..."
                                    className="cond-custom-textarea"
                                />
                            </div>

                            {/* Blocos ELSEIF */}
                            <div className="elif-section-container" style={{ marginTop: '1.5rem' }}>
                                <div className="elif-header-row">
                                    <h5 className="sub-config-title">🔀 Condições Intermediárias (ELSEIF / ELIF)</h5>
                                    <button type="button" onClick={handleAddElif} className="add-elif-btn">
                                        ➕ Adicionar Bloco ELSEIF
                                    </button>
                                </div>

                                <div className="elif-blocks-list">
                                    {elifsList && elifsList.length > 0 ? (
                                        elifsList.map((elif, idx) => (
                                            <div key={elif.id} className="elif-block-item fade-in">
                                                <div className="elif-item-header">
                                                    <span>Opção ELSEIF #{idx + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveElif(elif.id)}
                                                        className="elif-remove-btn"
                                                        title="Remover este bloco"
                                                    >
                                                        ✖
                                                    </button>
                                                </div>

                                                <div className="cond-config-row" style={{ marginTop: '0.5rem' }}>
                                                    <div className="form-group-inline">
                                                        <label>Variável</label>
                                                        <select
                                                            value={elif.variable}
                                                            onChange={(e) => handleUpdateElif(elif.id, 'variable', e.target.value)}
                                                            className="cond-custom-select"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {allVars.map((v) => (
                                                                <option key={v.key || v.id} value={v.key}>
                                                                    {v.key}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="form-group-inline">
                                                        <label>Operador</label>
                                                        <select
                                                            value={elif.operator}
                                                            onChange={(e) => handleUpdateElif(elif.id, 'operator', e.target.value)}
                                                            className="cond-custom-select"
                                                        >
                                                            <option value="==">== (Igual)</option>
                                                            <option value="!=">!= (Diferente)</option>
                                                            <option value=">">&gt; (Maior)</option>
                                                            <option value="<">&lt; (Menor)</option>
                                                            <option value=">=">&gt;= (Maior ou igual)</option>
                                                            <option value="<=">&lt;= (Menor ou igual)</option>
                                                        </select>
                                                    </div>

                                                    <div className="form-group-inline flex-grow">
                                                        <label>Valor de Comparação</label>
                                                        {elif.variable ? (
                                                            renderValueInput(
                                                                elif.variable,
                                                                elif.value,
                                                                (val) => handleUpdateElif(elif.id, 'value', val),
                                                                `elif-value-input-${elif.id}`
                                                            )
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                disabled
                                                                placeholder="Selecione a variável..."
                                                                className="cond-custom-input disabled"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="form-group-block" style={{ marginTop: '0.75rem' }}>
                                                    <label
                                                        htmlFor={`elif-text-input-${elif.id}`}
                                                        className="input-block-label"
                                                    >
                                                        💬 Resposta para este ELSEIF
                                                    </label>
                                                    <textarea
                                                        id={`elif-text-input-${elif.id}`}
                                                        value={elif.trueText}
                                                        onChange={(e) => handleUpdateElif(elif.id, 'trueText', e.target.value)}
                                                        placeholder="Digite a resposta do bot para esta condição..."
                                                        className="cond-custom-textarea"
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="elif-empty-text">
                                            Nenhum bloco ELSEIF adicionado. Você pode adicionar múltiplos caminhos se desejar.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Texto ELSE */}
                            <div className="form-group-block" style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>
                                <label htmlFor="cond-false-text-input" className="input-block-label">
                                    💬 Resposta Padrão Alternativa (ELSE)
                                </label>
                                <textarea
                                    id="cond-false-text-input"
                                    value={condFalseText}
                                    onChange={(e) => setCondFalseText(e.target.value)}
                                    placeholder="Digite a resposta padrão alternativa aqui..."
                                    className="cond-custom-textarea"
                                />
                            </div>

                            {/* Preview em Tempo Real */}
                            <div className="realtime-preview-card">
                                <div className="preview-header">
                                    <span>👀 Preview em Tempo Real</span>
                                    <span className="preview-glow-dot"></span>
                                </div>
                                <pre className="preview-code-glow">{getGeneratedSnippet()}</pre>
                            </div>

                            {/* Simulador de Resultado em Tempo Real */}
                            {usedVars.length > 0 && (
                                <div className="realtime-preview-card" style={{ marginTop: '1rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                    <div className="preview-header" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                        <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>🧪 Simulador de Resultado</span>
                                        <span className="preview-glow-dot" style={{ background: '#818cf8', boxShadow: '0 0 10px #818cf8' }}></span>
                                    </div>
                                    <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                            {usedVars.map(v => (
                                                <div key={v} className="form-group-inline flex-grow" style={{ minWidth: '150px' }}>
                                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{v}</label>
                                                    {renderValueInput(
                                                        v,
                                                        simulatedValues[v] || '',
                                                        (val) => setSimulatedValues({ ...simulatedValues, [v]: val }),
                                                        `sim-value-input-${v}`
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>Resultado Esperado:</div>
                                            <div data-testid="expected-result" style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#34d399', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {getEvaluationResult()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="modal-footer">
                    {!selectedVar ? (
                        <button onClick={onClose} className="secondary-btn" style={{ padding: '0.75rem 2rem' }}>
                            Fechar
                        </button>
                    ) : (
                        <div className="config-footer-buttons" style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            {editMode && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="delete-cond-btn"
                                    type="button"
                                >
                                    🗑️ Deletar Condicional
                                </button>
                            )}
                            {!editMode ? (
                                <button
                                    onClick={() => setSelectedVar(null)}
                                    className="secondary-btn"
                                    style={{ marginRight: '8px' }}
                                >
                                    ⬅️ Voltar
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="secondary-btn"
                                    style={{ marginRight: '8px' }}
                                >
                                    ❌ Cancelar
                                </button>
                            )}
                            <button
                                id="cond-modal-save-btn"
                                onClick={onSave}
                                className={`primary-btn ${editMode ? 'update-cond-btn' : 'insert-configured-btn'}`}
                            >
                                {editMode ? '✅ Atualizar Condicional' : '✨ Inserir no Prompt'}
                            </button>
                        </div>
                    )}
                </footer>
            </div>

            {showDeleteConfirm && (
                <div className="cond-modal-overlay fade-in" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.75)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="cond-modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem', background: '#1e1b4b', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <header className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', padding: 0 }}>
                            <h3 style={{ color: '#f87171', margin: 0 }}>⚠️ Confirmar Exclusão</h3>
                        </header>
                        <div className="modal-body" style={{ margin: '1.5rem 0', padding: 0 }}>
                            <p style={{ fontSize: '0.95rem', opacity: 0.9, color: '#e0e7ff' }}>
                                Tem certeza de que deseja deletar esta condicional?
                            </p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem', color: '#c7d2fe' }}>
                                Esta ação não pode ser desfeita e removerá todo o bloco condicional do prompt.
                            </p>
                        </div>
                        <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', borderTop: 'none', padding: 0 }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="secondary-btn"
                                style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                type="button"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    onDelete();
                                    setShowDeleteConfirm(false);
                                }}
                                className="primary-btn"
                                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', padding: '0.75rem 1.5rem' }}
                                type="button"
                            >
                                Sim, Deletar
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default ConditionalBuilderModal;
