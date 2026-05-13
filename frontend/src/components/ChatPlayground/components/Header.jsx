import React from 'react';

const Header = ({ agents, selectedAgentId }) => {
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="chat-premium-header fade-in">
            <div className="agent-brand">
                <div className="agent-avatar-status">
                    <div className="avatar-mini">🤖</div>
                    <span className="status-dot"></span>
                </div>
                <div className="agent-meta-title">
                    <h3>{selectedAgent?.name || 'Agente Inteligente'}</h3>
                    <p>Assitente Virtual Nativo</p>
                </div>
                {selectedAgentId && (
                    <a
                        href={`/agent/${selectedAgentId}?tab=prompts`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)',
                            border: '1px solid rgba(99,102,241,0.35)',
                            color: '#a5b4fc', borderRadius: '8px',
                            padding: '5px 11px', fontSize: '0.75rem', fontWeight: 700,
                            textDecoration: 'none', whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease', marginLeft: '12px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(168,85,247,0.28) 100%)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        ✏️ Editar Prompt
                    </a>
                )}
            </div>
        </div>
    );
};

export default Header;
