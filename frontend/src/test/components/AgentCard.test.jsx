import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentCard from '../../components/Dashboard/components/AgentCard';
import { DashboardProvider } from '../../components/Dashboard/DashboardContext';

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock da API fetch global
global.fetch = vi.fn();

const mockAgent = {
    id: 'agent-123',
    name: 'Agente Teste',
    description: 'Uma descrição de teste',
    model: 'gpt-4o',
    is_active: true
};

describe('AgentCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('user_role', 'Super Admin');
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <DashboardProvider>
                    <AgentCard agent={mockAgent} />
                </DashboardProvider>
            </MemoryRouter>
        );
    };

    it('deve renderizar as informações do agente corretamente', () => {
        renderComponent();
        expect(screen.getByText('Agente Teste')).toBeInTheDocument();
        expect(screen.getByText('Uma descrição de teste')).toBeInTheDocument();
        expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    });

    it('deve abrir o modal de confirmação ao clicar no botão de excluir', async () => {
        renderComponent();
        
        const deleteBtn = screen.getByTitle('Excluir');
        fireEvent.click(deleteBtn);

        // O ConfirmModal deve aparecer (buscando pelo título configurado no AgentCard)
        expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir o agente/)).toBeInTheDocument();
    });

    it('deve chamar a API de exclusão ao confirmar no modal', async () => {
        fetch.mockResolvedValueOnce({ ok: true });
        renderComponent();

        // Abre o modal
        fireEvent.click(screen.getByTitle('Excluir'));
        
        // Clica em "Sim, Excluir" no ConfirmModal
        const confirmBtn = screen.getByText('Sim, Excluir');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/agents/agent-123', expect.objectContaining({
                method: 'DELETE'
            }));
        });
    });

    it('deve navegar para a página de configuração ao clicar no botão configurar', () => {
        renderComponent();
        const configBtn = screen.getByText('⚙️ Configurar');
        fireEvent.click(configBtn);
        expect(mockNavigate).toHaveBeenCalledWith('/agent/agent-123');
    });
});
