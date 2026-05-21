import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
        put: vi.fn(),
        delete: (...args) => mockDelete(...args),
    },
}));

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8002',
    AGENT_API_KEY: 'test-key',
}));

// Mock da clipboard
const writeTextMock = vi.fn();
Object.assign(navigator, {
    clipboard: {
        writeText: writeTextMock,
    },
});

import InviteManagement from '../../components/InviteManagement';

describe('InviteManagement Component', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockPost.mockReset();
        mockDelete.mockReset();
        writeTextMock.mockReset();
    });

    it('deve listar convites ativos obtidos do backend', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
                {
                    id: 1,
                    token: 'invite-token-uuid-1',
                    role: 'Admin',
                    expires_at: '2026-05-22T12:00:00Z',
                    created_at: '2026-05-21T12:00:00Z',
                    is_used: false
                },
                {
                    id: 2,
                    token: 'invite-token-uuid-2',
                    role: 'Usuário',
                    expires_at: '2026-05-23T12:00:00Z',
                    created_at: '2026-05-21T12:00:00Z',
                    is_used: false
                }
            ]),
        });

        render(<InviteManagement />);

        await waitFor(() => {
            const rows = screen.getAllByRole('row');
            const rowTexts = rows.map(r => r.textContent);
            expect(rowTexts.some(txt => txt.includes('Admin'))).toBe(true);
            expect(rowTexts.some(txt => txt.includes('Usuário'))).toBe(true);
            expect(rowTexts.some(txt => txt.includes('invite-t'))).toBe(true);
        });
    });

    it('deve permitir abrir o modal e gerar um convite', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
        });

        mockPost.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                id: 3,
                token: 'generated-token-123',
                role: 'Admin',
                expires_at: '2026-05-22T12:00:00Z',
                created_at: '2026-05-21T12:00:00Z',
                is_used: false
            }),
        });

        render(<InviteManagement />);

        await userEvent.click(screen.getByText('+ Gerar Convite'));

        expect(screen.getByText('Gerar Novo Convite')).toBeInTheDocument();

        // Alterar os campos se necessario
        fireEvent.change(screen.getByLabelText('NÍVEL DE ACESSO (CARGO)'), { target: { value: 'Admin' } });
        fireEvent.change(screen.getByLabelText('VALIDADE DO LINK'), { target: { value: '48' } });

        fireEvent.submit(screen.getByText('Gerar Convite').closest('form'));

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/users/invites', {
                role: 'Admin',
                validity_hours: 48
            });
        });

        await waitFor(() => {
            expect(screen.getByText(/Envie o link abaixo para o convidado/i)).toBeInTheDocument();
            expect(screen.getByDisplayValue(/register\/generated-token-123/)).toBeInTheDocument();
        });
    });

    it('deve permitir copiar o link de convite gerado', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
        });

        mockPost.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                id: 3,
                token: 'generated-token-123',
                role: 'Admin',
                expires_at: '2026-05-22T12:00:00Z',
                created_at: '2026-05-21T12:00:00Z',
                is_used: false
            }),
        });

        render(<InviteManagement />);

        await userEvent.click(screen.getByText('+ Gerar Convite'));
        fireEvent.submit(screen.getByText('Gerar Convite').closest('form'));

        await waitFor(() => {
            expect(screen.getByText('Copiar')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText('Copiar'));

        expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/register/generated-token-123'));
    });

    it('deve permitir revogar um convite apos confirmacao', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
                {
                    id: 1,
                    token: 'invite-token-uuid-1',
                    role: 'Admin',
                    expires_at: '2026-05-22T12:00:00Z',
                    created_at: '2026-05-21T12:00:00Z',
                    is_used: false
                }
            ]),
        });

        mockDelete.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        });

        render(<InviteManagement />);

        await waitFor(() => {
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        // Clicar no botao de excluir (lixeira)
        const deleteBtn = screen.getByTitle('Revogar');
        await userEvent.click(deleteBtn);

        expect(screen.getByText('Revogar Convite')).toBeInTheDocument();

        // Clicar em Confirmar
        await userEvent.click(screen.getByText('Revogar'));

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('/users/invites/invite-token-uuid-1');
        });
    });
});
