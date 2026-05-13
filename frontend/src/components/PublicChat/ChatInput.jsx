import React from 'react';

function ChatInput({ input, setInput, loading, handleSendMessage, isInputExpanded, setIsInputExpanded, primaryColor }) {
    return (
        <footer className="public-chat-footer">
            <form onSubmit={handleSendMessage} className={`public-chat-form ${isInputExpanded ? 'expanded' : ''}`}>
                <textarea
                    value={loading ? "A IA está processando sua resposta..." : input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={loading}
                    className={loading ? "input-processing custom-scrollbar" : "custom-scrollbar"}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (!e.ctrlKey && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            } else if (e.ctrlKey) {
                                e.preventDefault();
                                const target = e.target;
                                const start = target.selectionStart;
                                const end = target.selectionEnd;
                                const newVal = input.substring(0, start) + '\n' + input.substring(end);
                                setInput(newVal);
                                setTimeout(() => {
                                    target.selectionStart = target.selectionEnd = start + 1;
                                }, 0);
                            }
                        }
                    }}
                    style={{
                        resize: 'none',
                        height: isInputExpanded ? '150px' : '44px',
                        minHeight: '44px',
                        fontFamily: 'inherit',
                        paddingTop: '12px'
                    }}
                />
                <div className="public-chat-actions" style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setIsInputExpanded(!isInputExpanded)}
                        disabled={loading}
                        className="expand-button"
                        title={isInputExpanded ? "Minimizar Chat" : "Maximizar Chat"}
                    >
                        {isInputExpanded ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        )}
                    </button>
                    <button type="submit" disabled={loading || !input.trim()} style={{ backgroundColor: primaryColor }}>
                        {loading ? '⏳' : '➤'}
                    </button>
                </div>
            </form>
            <style>{`
                .expand-button {
                    background-color: transparent !important;
                    color: #94a3b8 !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </footer>
    );
}

export default ChatInput;
