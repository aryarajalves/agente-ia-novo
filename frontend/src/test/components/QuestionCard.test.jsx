import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import QuestionCard from '../../components/UnansweredQuestions/components/QuestionCard';

// Mock do hook useQuestionsActions
vi.mock('../../components/UnansweredQuestions/hooks/useQuestionsActions', () => ({
    useQuestionsActions: () => ({
        openModal: vi.fn(),
    })
}));

// Mock do hook useQuestions
vi.mock('../../components/UnansweredQuestions/QuestionsContext', () => ({
    useQuestions: () => ({
        selectedIds: new Set(),
        setSelectedIds: vi.fn(),
    })
}));

// Mock do hook react-router-dom
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

describe('QuestionCard', () => {
    const defaultQuestion = {
        id: 1,
        agent_id: 2,
        session_id: '5511999999999',
        session_id_raw: '12345',
        question: 'Qual o valor do produto?',
        source: 'chatwoot',
        created_at: '2026-06-19T12:00:00.000Z',
    };

    it('deve renderizar a origem Chatwoot e o ID da sessão raw', () => {
        render(<QuestionCard question={defaultQuestion} index={0} />);

        // Deve conter a badge da origem
        expect(screen.getByText('💬 Chatwoot')).toBeInTheDocument();

        // Deve conter o telefone e o ID raw
        expect(screen.getByText(/5511999999999/)).toBeInTheDocument();
        expect(screen.getByText('(ID: 12345)')).toBeInTheDocument();
    });

    it('deve renderizar a origem Chat simples quando a source for chat', () => {
        const chatQuestion = {
            ...defaultQuestion,
            source: 'chat',
            session_id_raw: '5511999999999', // Iguais, não deve mostrar a tag ID
        };

        render(<QuestionCard question={chatQuestion} index={0} />);

        expect(screen.getByText('💻 Chat')).toBeInTheDocument();
        expect(screen.queryByText('(ID:')).not.toBeInTheDocument();
    });

    it('deve exibir o ID da sessão do chat quando chat_session_id estiver disponível', () => {
        const chatWithSession = {
            ...defaultQuestion,
            source: 'chat',
            session_id: '5511888888888',
            session_id_raw: '5511888888888',
            chat_session_id: 'td6ylv',
        };

        render(<QuestionCard question={chatWithSession} index={0} />);

        // Deve exibir a tag de sessão com o ID
        expect(screen.getByText(/Sessão: td6ylv/)).toBeInTheDocument();
    });

    it('não deve exibir tag de sessão quando chat_session_id for nulo', () => {
        const questionWithoutSession = {
            ...defaultQuestion,
            chat_session_id: null,
        };

        render(<QuestionCard question={questionWithoutSession} index={0} />);

        expect(screen.queryByText(/🔑 Sessão:/)).not.toBeInTheDocument();
    });

    it('deve exibir a tag de sessão com estilo monospace para identificação técnica', () => {
        const chatWithSession = {
            ...defaultQuestion,
            source: 'chat',
            chat_session_id: 'abc123',
        };

        render(<QuestionCard question={chatWithSession} index={0} />);

        const sessionTag = screen.getByText(/Sessão: abc123/);
        expect(sessionTag).toBeInTheDocument();
        expect(sessionTag.closest('span')).toHaveStyle({ fontFamily: 'monospace' });
    });
});
