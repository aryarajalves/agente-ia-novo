import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8002',
    AGENT_API_KEY: 'test-key',
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useParams: () => ({ token: 'mock-token-123' }),
    useNavigate: () => mockNavigate
}));

import Register from '../../components/Register';

describe('Register Component', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockPost.mockReset();
        mockNavigate.mockReset();
    });

    it('deve exibir tela de carregamento enquanto valida o token', () => {
        mockGet.mockReturnValue(new Promise(() => {})); // Nunca resolve
        render(<Register />);
        expect(screen.getByText('Validando...')).toBeInTheDocument();
    });

    it('deve exibir erro se o token for invalido', async () => {
        mockGet.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: 'Este convite expirou ou já foi utilizado.' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Convite Inválido')).toBeInTheDocument();
            expect(screen.getByText('Este convite expirou ou já foi utilizado.')).toBeInTheDocument();
        });
    });

    it('deve renderizar o formulario se o token for valido', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Crie uma senha forte')).toBeInTheDocument();
        });
    });

    it('deve enviar o cadastro com sucesso e redirecionar para login', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        mockPost.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, user_id: 1 }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
        });

        await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
        await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@silva.com');
        await userEvent.type(screen.getByPlaceholderText('Crie uma senha forte'), 'senha123');

        fireEvent.submit(screen.getByText('Finalizar Cadastro').closest('form'));

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/users/register/mock-token-123', {
                name: 'Maria Silva',
                email: 'maria@silva.com',
                password: 'senha123'
            });
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('deve exibir erro se o email ja estiver em uso', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        mockPost.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: 'Este e-mail já está em uso' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
        });

        await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
        await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@silva.com');
        await userEvent.type(screen.getByPlaceholderText('Crie uma senha forte'), 'senha123');

        fireEvent.submit(screen.getByText('Finalizar Cadastro').closest('form'));

        await waitFor(() => {
            expect(screen.getByText('Este e-mail já está em uso')).toBeInTheDocument();
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
