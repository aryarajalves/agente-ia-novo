import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock do API client
const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('../../api/client', () => ({
    api: mockApi
}));

// Mock global fetch for the advisor API call
global.fetch = vi.fn();

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

import PromptEditor from '../../components/PromptEditor';

describe('PromptEditor - Nova Arquitetura com Consultor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApi.get.mockImplementation((url) => {
            if (url === '/global-variables') {
                return Promise.resolve({
                    json: () => Promise.resolve({ variables: [] })
                });
            }
            if (url.startsWith('/agents/')) {
                return Promise.resolve({
                    json: () => Promise.resolve({ id: '1', main_model: 'gpt-4o-mini' })
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        global.fetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ content: 'Sugestão do Consultor: Adicione mais clareza.' }),
            })
        );
    });

    it('deve renderizar o editor e a bolinha flutuante inicialmente', () => {
        render(<PromptEditor value="Teste de Prompt" onChange={() => {}} agentId="1" />);
        expect(screen.getByText(/instrucoes.prompt/i)).toBeInTheDocument();
        expect(screen.getByText('💡')).toBeInTheDocument(); // A bolinha flutuante
    });

    it('deve alternar a visibilidade do chat flutuante ao clicar na bolinha', () => {
        render(<PromptEditor value="" onChange={() => {}} />);
        const bubble = screen.getByText('💡');
        
        // Abre
        fireEvent.click(bubble);
        expect(screen.getAllByText(/Consultor de Prompt/i).length).toBeGreaterThan(0);
        
        // Fecha
        const closeBubble = screen.getByTitle(/Fechar Consultor/i);
        fireEvent.click(closeBubble);
        expect(screen.queryByText(/IA Especialista/i)).not.toBeInTheDocument();
    });

    it('deve permitir enviar mensagem para o consultor e receber resposta', async () => {
        render(<PromptEditor value="Prompt inicial" onChange={() => {}} />);
        
        // Abre o chat antes de enviar
        fireEvent.click(screen.getByText('💡'));
        
        const input = screen.getByPlaceholderText(/Pergunte ao consultor/i);
        const sendBtn = screen.getByText('🚀');

        fireEvent.change(input, { target: { value: 'Como melhorar este prompt?' } });
        fireEvent.click(sendBtn);

        expect(screen.getByText('Como melhorar este prompt?')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText(/Sugestão do Consultor: Adicione mais clareza/i)).toBeInTheDocument();
        });
        
        expect(global.fetch).toHaveBeenCalled();
    });

    it('deve chamar onChange ao digitar no editor', () => {
        const handleChange = vi.fn();
        render(<PromptEditor value="" onChange={handleChange} />);
        
        const textarea = screen.getByPlaceholderText(/Escreva aqui as instruções principais/i);
        fireEvent.change(textarea, { target: { value: 'Novo conteúdo' } });
        
        expect(handleChange).toHaveBeenCalled();
    });
});
