import React from 'react';

function MessageList({ messages, loading, agent, scrollRef, primaryColor }) {
    return (
        <main className="public-chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="empty-chat-placeholder">
                    <div className="avatar-large">🤖</div>
                    <h3>{agent.name}</h3>
                    {agent.ui_chat_title && <p className="subtitle">{agent.ui_chat_title}</p>}
                    <p>Envie uma mensagem para iniciar a conversa.</p>
                </div>
            )}
            {messages.map((msg, i) => (
                <div key={i} className={`public-message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}>
                    {msg.role === 'assistant' && <div className="public-avatar">🤖</div>}
                    <div className={`public-message-bubble ${msg.role}`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                        {msg.content.split('\n').map((line, j) => (
                            <React.Fragment key={j}>
                                {line}
                                <br />
                            </React.Fragment>
                        ))}

                        {msg.role === 'assistant' && msg.model && (
                            <div className="message-meta-info">
                                <span className="model-tag">
                                    ✨ Gerado por <strong>{msg.model}</strong>
                                </span>
                                {msg.tool_calls && (
                                    <span className="tool-tag" title="Executou ferramentas">🛠️</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="public-message-row assistant-row">
                    <div className="public-avatar">🤖</div>
                    <div className="public-message-bubble typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            )}
        </main>
    );
}

export default MessageList;
