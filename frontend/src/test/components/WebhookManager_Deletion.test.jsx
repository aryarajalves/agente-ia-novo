import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WebhookManager from '../../components/WebhookManager';
import { api } from '../../api/client';

// Helper para criar Response mock
const createMockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
});

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8000',
}));

// Mock do scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('WebhookManager - Deleção de Integração', () => {
    const mockWebhook = {
        id: 'wh_123',
        name: 'Webhook de Teste',
        token: 'test-token',
        active: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/webhooks') return Promise.resolve(createMockResponse([mockWebhook]));
            if (url === '/agents') return Promise.resolve(createMockResponse([]));
            return Promise.resolve(createMockResponse([]));
        });
    });

    it('deve abrir o modal de confirmação ao clicar no botão de excluir', async () => {
        render(<WebhookManager />);

        // Espera a lista carregar
        await waitFor(() => expect(screen.getByText('Webhook de Teste')).toBeInTheDocument());

        // Clica no botão de excluir (lixeira)
        const deleteBtn = screen.getByText('Excluir');
        fireEvent.click(deleteBtn);

        // Verifica se o modal abriu
        expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir permanentemente a integração "Webhook de Teste"?/i)).toBeInTheDocument();
    });

    it('deve fechar o modal ao clicar em Cancelar', async () => {
        render(<WebhookManager />);

        await waitFor(() => expect(screen.getByText('Webhook de Teste')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Excluir'));

        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);

        // O modal deve sumir
        expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument();
    });

    it('deve chamar a API de deleção ao clicar em Sim, Excluir', async () => {
        api.delete.mockResolvedValue(createMockResponse({ success: true }));
        
        render(<WebhookManager />);

        await waitFor(() => expect(screen.getByText('Webhook de Teste')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Excluir'));

        const confirmBtn = screen.getByText('Sim, Excluir');
        fireEvent.click(confirmBtn);

        // Verifica se chamou a API correta
        expect(api.delete).toHaveBeenCalledWith('/webhooks/wh_123');
        
        // Verifica se o modal fechou após a resposta da API (implícito no fluxo do componente)
        await waitFor(() => expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument());
    });
});
