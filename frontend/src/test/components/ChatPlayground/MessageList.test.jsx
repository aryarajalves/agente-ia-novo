import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from '../../../components/ChatPlayground/components/MessageList';

const mockMessages = [
    { role: 'user', content: 'Olá', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'Olá, como posso ajudar?', tokens: { total: 10 }, cost: 0.01, timestamp: new Date().toISOString() }
];

const mockProps = {
    isBattleMode: false,
    messages: mockMessages,
    battleMessages: [],
    loading: false,
    agents: [{ id: '1', name: 'Agent 1', model: 'gpt-4' }],
    selectedAgentId: '1',
    challengerAgentId: null,
    mainModelOverride: '',
    challengerModelOverride: '',
    handleFeedback: vi.fn(),
    scrollRef: { current: null },
    battleScrollRef: { current: null }
};

describe('MessageList Component', () => {
    it('deve renderizar as mensagens do chat principal', () => {
        render(<MessageList {...mockProps} />);
        expect(screen.getByText('Olá')).toBeInTheDocument();
        expect(screen.getByText('Olá, como posso ajudar?')).toBeInTheDocument();
    });

    it('deve exibir o indicador de carregamento quando loading=true', () => {
        render(<MessageList {...mockProps} loading={true} />);
        // O TypingIndicator é renderizado. Como é um componente simples, podemos procurar por uma classe ou estrutura.
        // No MessageList.jsx, o loading renderiza o TypingIndicator.
        const dots = document.querySelector('.typing-indicator');
        expect(dots).toBeInTheDocument();
    });

    it('deve renderizar duas colunas no modo Battle', () => {
        const battleProps = {
            ...mockProps,
            isBattleMode: true,
            battleMessages: [{ role: 'assistant', content: 'Resposta Desafiante', timestamp: new Date().toISOString() }],
            challengerAgentId: '2',
            agents: [...mockProps.agents, { id: '2', name: 'Challenger', model: 'gpt-3.5' }]
        };
        render(<MessageList {...battleProps} />);
        expect(screen.getByText('Resposta Desafiante')).toBeInTheDocument();
        expect(screen.getByText('🥊 Challenger')).toBeInTheDocument();
    });
});
