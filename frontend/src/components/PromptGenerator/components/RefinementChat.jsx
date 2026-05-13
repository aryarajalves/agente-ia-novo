import React from 'react';
import { usePromptGenerator } from '../PromptGeneratorContext';
import { usePromptGeneratorActions } from '../hooks/usePromptGeneratorActions';

const RefinementChat = () => {
    const { chatMessages, chatInput, setChatInput, isTalkingToAI, isGenerating, setMaximizedField } = usePromptGenerator();
    const { handleSendChatMessage, handleApplySuggestions } = usePromptGeneratorActions();

    return (
        <div className="refinement-chat">
            <div className="chat-header"><span>💬 Consultoria de Prompt</span></div>
            <div className="chat-messages-container">
                {chatMessages.length === 0 ? (
                    <div className="empty-chat">Converse com a IA para ajustar detalhes do seu prompt mestre.</div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                            <div className="message-content">{msg.content}</div>
                        </div>
                    ))
                )}
                {isTalkingToAI && (
                    <div className="chat-message assistant loading">
                        <div className="typing-dots"><span>.</span><span>.</span><span>.</span></div>
                    </div>
                )}
            </div>

            <div className="chat-input-wrapper">
                <input
                    type="text"
                    placeholder="Tire dúvidas ou peça ajustes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                />
                <button className="chat-maximize-btn" onClick={() => setMaximizedField({ name: 'chatInput', label: 'Mensagem para a IA' })}>⤢</button>
                <button onClick={handleSendChatMessage} disabled={!chatInput.trim() || isTalkingToAI}>➤</button>
            </div>

            {chatMessages.length > 0 && (
                <button className="apply-improvements-btn" onClick={handleApplySuggestions} disabled={isGenerating}>
                    ✨ Aplicar Melhorias Sugeridas
                </button>
            )}
        </div>
    );
};

export default RefinementChat;
