import React from 'react';
import SessionItem from './SessionItem';

const HistoryList = ({
    sessions,
    historyFilter,
    setHistoryFilter,
    isSelectionMode,
    toggleSelectionMode,
    selectedSessions,
    toggleSelectAll,
    setShowDeleteConfirm,
    extractBatchQuestions,
    toggleSessionSelection,
    loadSession,
    currentSessionId
}) => {
    return (
        <div className="history-list fade-in">
            <div className="history-header-actions">
                <div className="title-row">
                    <h4 style={{ color: 'white', margin: 0 }}>Conversas Anteriores</h4>
                    <button
                        className={`manage-btn ${isSelectionMode ? 'active' : ''}`}
                        onClick={toggleSelectionMode}
                        title={isSelectionMode ? "Cancelar Seleção" : "Gerenciar Conversas"}
                    >
                        {isSelectionMode ? '✖' : '⚙️'}
                    </button>
                </div>

                <div className="history-filters">
                    <button
                        onClick={() => setHistoryFilter('all')}
                        className={historyFilter === 'all' ? 'active' : ''}
                    >Tudo</button>
                    <button
                        onClick={() => setHistoryFilter('test')}
                        className={historyFilter === 'test' ? 'active test' : 'test'}
                    >🤖 Testes</button>
                </div>
            </div>

            {isSelectionMode && (
                <div className="selection-toolbar fade-in">
                    <label className="select-all-label">
                        <input
                            type="checkbox"
                            checked={sessions.length > 0 && selectedSessions.size === sessions.length}
                            onChange={toggleSelectAll}
                        />
                        <span>Todos</span>
                    </label>
                    <button
                        className="delete-selected-btn"
                        disabled={selectedSessions.size === 0}
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        🗑️ ({selectedSessions.size})
                    </button>
                </div>
            )}

            {isSelectionMode && selectedSessions.size > 0 && (
                <button
                    className="batch-extract-premium fade-in"
                    onClick={extractBatchQuestions}
                >
                    💎 Extrair Perguntas de ({selectedSessions.size})
                </button>
            )}

            <div className="history-items-container custom-scrollbar">
                {sessions.length === 0 ? (
                    <p className="empty-msg">Nenhuma conversa encontrada.</p>
                ) : (
                    sessions
                        .filter(s => historyFilter === 'all' || s.is_test_session)
                        .length === 0 ? (
                        <p className="empty-msg">
                            {historyFilter === 'test' ? 'Nenhum teste de IA encontrado.' : 'Nenhuma conversa encontrada.'}
                        </p>
                    ) : sessions
                        .filter(s => historyFilter === 'all' || s.is_test_session)
                        .map(session => (
                            <SessionItem
                                key={session.session_id}
                                session={session}
                                currentSessionId={currentSessionId}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedSessions.has(session.session_id)}
                                onToggleSelection={toggleSessionSelection}
                                onLoadSession={loadSession}
                            />
                        ))
                )}
            </div>
        </div>
    );
};

export default HistoryList;
