import React from 'react';
import { useQuestions } from '../QuestionsContext';

const InboxFilters = () => {
    const {
        questionType, setQuestionType,
        agentFilterId, setAgentFilterId,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        agentsSummary, setPage
    } = useQuestions();

    const activeFiltersCount = [questionType, agentFilterId, dateFrom, dateTo].filter(Boolean).length;

    const applyAndResetPage = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const handleClearFilters = () => {
        setQuestionType('');
        setAgentFilterId('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    return (
        <div className="uq-filters-bar">
            <div className="uq-filters-label">
                <span className="uq-filters-icon">🔎</span>
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                    <span className="uq-filters-count-badge">{activeFiltersCount}</span>
                )}
            </div>

            <div className="uq-filter-group">
                <label className="uq-filter-label">Tipo</label>
                <select
                    value={questionType}
                    onChange={applyAndResetPage(setQuestionType)}
                    className="uq-filter-select"
                >
                    <option value="">Todos os tipos</option>
                    <option value="DUVIDA_USUARIO">❓ Dúvida do Usuário</option>
                    <option value="ERRO_FERRAMENTA">⚠️ Erro de Ferramenta</option>
                </select>
            </div>

            <div className="uq-filter-group">
                <label className="uq-filter-label">Agente</label>
                <select
                    value={agentFilterId}
                    onChange={applyAndResetPage(setAgentFilterId)}
                    className="uq-filter-select"
                >
                    <option value="">Todos os agentes</option>
                    {agentsSummary.map(a => (
                        <option key={a.agent_id ?? 'none'} value={a.agent_id ?? ''}>
                            🤖 {a.agent_name} ({a.count})
                        </option>
                    ))}
                </select>
            </div>

            <div className="uq-filter-group">
                <label className="uq-filter-label">De</label>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={applyAndResetPage(setDateFrom)}
                    className="uq-filter-date"
                />
            </div>

            <div className="uq-filter-group">
                <label className="uq-filter-label">Até</label>
                <input
                    type="date"
                    value={dateTo}
                    onChange={applyAndResetPage(setDateTo)}
                    className="uq-filter-date"
                />
            </div>

            {activeFiltersCount > 0 && (
                <button className="btn-clear-filters" onClick={handleClearFilters}>
                    ✕ Limpar filtros
                </button>
            )}
        </div>
    );
};

export default InboxFilters;
