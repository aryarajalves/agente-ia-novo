import React from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';
import { usePromptGeneratorActions } from '../hooks/usePromptGeneratorActions';

const PublishModal = () => {
    const { agents, searchTerm, setSearchTerm, selectedAgentId, setSelectedAgentId, setShowPublishModal, isPublishing } = usePromptGenerator();
    const { handlePublishToAgent } = usePromptGeneratorActions();

    const filteredAgents = (agents || []).filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.id.toString().includes(searchTerm)
    );

    return (
        <div className="maximize-overlay" onClick={() => setShowPublishModal(false)}>
            <div className="maximize-modal publish-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Publicar no Agente</h3>
                    <button className="close-modal-btn" onClick={() => setShowPublishModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="modal-search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            className="modal-search-input"
                            placeholder="Buscar agente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="agent-grid">
                        {filteredAgents.map(agent => (
                            <div
                                key={agent.id}
                                className={`agent-card-select ${selectedAgentId === agent.id ? 'selected' : ''}`}
                                onClick={() => setSelectedAgentId(agent.id)}
                            >
                                <div className="agent-info-small">
                                    <strong>{agent.name}</strong>
                                    <span>#{agent.id} | {agent.model}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={() => setShowPublishModal(false)}>Cancelar</button>
                    <button className="btn-confirm" onClick={handlePublishToAgent} disabled={isPublishing || !selectedAgentId}>
                        {isPublishing ? 'Publicando...' : 'Confirmar Publicação'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublishModal;
