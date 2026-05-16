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

vi.mock('../../api/client', () => {
    const mockApi = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    };
    return {
        api: mockApi,
        default: mockApi,
    };
});

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8000',
}));

describe('WebhookManager - Copy Functionality', () => {
    const mockWebhook = {
        id: 1,
        name: 'Webhook Teste',
        token: 'test-token',
        leads_table: 'leads_test',
        is_active: true,
        created_at: '2023-01-01T10:00:00Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/webhooks') return Promise.resolve(createMockResponse([mockWebhook]));
            if (url === '/agents') return Promise.resolve(createMockResponse([]));
            if (url === '/chatwoot-config') return Promise.resolve(createMockResponse({ configured: true }));
            return Promise.resolve(createMockResponse([]));
        });

        // Mock navigator.clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });
    });

    it('deve copiar a URL correta e mostrar o toast', async () => {
        render(<WebhookManager />);

        // Aguarda renderização do webhook
        expect(await screen.findByText(/Webhook Teste/i)).toBeInTheDocument();

        // Encontra o botão de copiar
        const btnCopiar = screen.getByTitle(/Copiar URL/i);
        fireEvent.click(btnCopiar);

        // Verifica se a URL copiada está correta (NÃO deve estar duplicada)
        const expectedUrl = 'http://localhost:8000/webhooks/receive/test-token';
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);

        // Verifica se o toast aparece
        expect(await screen.findByText(/URL copiada para a área de transferência!/i)).toBeInTheDocument();
        
        // Verifica se o ícone mudou para check (✓)
        expect(screen.getByText('✓')).toBeInTheDocument();
    });
});
