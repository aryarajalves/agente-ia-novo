import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import './styles.css';

function PublicChat() {
    const { agentId } = useParams();
    const [agent, setAgent] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(Math.random().toString(36).substring(7));
    const [error, setError] = useState('');
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        api.get(`/agents/${agentId}`)
            .then(res => {
                if (!res.ok) throw new Error('Agente não encontrado ou inativo.');
                return res.json();
            })
            .then(data => {
                if (!data.is_active) {
                    throw new Error('Este agente está inativo no momento.');
                }
                setAgent(data);
            })
            .catch(err => setError(err.message));
    }, [agentId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const text = input.trim();
        if (!text || loading || !agent) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setLoading(true);

        try {
            const response = await api.post(`/execute`, {
                message: text,
                agent_id: agentId,
                session_id: sessionId
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response,
                model: data.model,
                tool_calls: data.tool_calls
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro de conexão ao enviar a mensagem.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="public-chat-error">
                <h2>Ops!</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!agent) {
        return <div className="public-chat-loading">Carregando Chat...</div>;
    }

    const primaryColor = agent.ui_primary_color || '#6366f1';
    const headerColor = agent.ui_header_color || 'rgba(30, 41, 59, 0.9)';

    return (
        <div className="public-chat-container">
            <header className="public-chat-header" style={{ backgroundColor: headerColor }}>
                <div className="agent-avatar">🤖</div>
                <div className="agent-info">
                    <div className="agent-name-row">
                        <h2>{agent.name}</h2>
                        {agent.ui_chat_title && <span className="agent-role-badge">{agent.ui_chat_title}</span>}
                    </div>
                    <p className="status">
                        <span className="online-dot"></span> Online agora
                    </p>
                </div>
            </header>

            <MessageList 
                messages={messages} 
                loading={loading} 
                agent={agent} 
                scrollRef={scrollRef} 
                primaryColor={primaryColor} 
            />

            <ChatInput 
                input={input}
                setInput={setInput}
                loading={loading}
                handleSendMessage={handleSendMessage}
                isInputExpanded={isInputExpanded}
                setIsInputExpanded={setIsInputExpanded}
                primaryColor={primaryColor}
            />
        </div>
    );
}

export default PublicChat;
