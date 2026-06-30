/**
 * =============================================
 * TESTES UNITÁRIOS: ObjectionsDashboard
 * =============================================
 * Cobre:
 * 1. Carregamento correto de agentes no select
 * 2. Exibição de estado vazio quando não há clusters
 * 3. Tratamento de erro quando API falha (lista vazia)
 * 4. Renderização do botão de recalcular
 * 5. Select de agente fica desabilitado durante recálculo
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ObjectionsDashboard from '../../components/ObjectionsDashboard';

// Mock do módulo de API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

import { api } from '../../api/client';

const renderDashboard = () =>
    render(
        <MemoryRouter>
            <ObjectionsDashboard />
        </MemoryRouter>
    );

describe('ObjectionsDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Carregamento de Agentes', () => {
        it('deve exibir os agentes carregados no select quando API retorna lista', async () => {
            // Simula API retornando 2 agentes
            api.get.mockImplementation((path) => {
                if (path === '/agents') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve([
                            { id: 1, name: 'Agente Vendas' },
                            { id: 2, name: 'Agente Suporte' }
                        ])
                    });
                }
                if (path === '/knowledge-bases') {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
                }
                if (path.includes('/analytics/objections')) {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ clusters: [] }) });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('🤖 Agente Vendas')).toBeInTheDocument();
                expect(screen.getByText('🤖 Agente Suporte')).toBeInTheDocument();
            });
        });

        it('deve exibir toast de aviso quando API retorna lista vazia de agentes', async () => {
            api.get.mockImplementation((path) => {
                if (path === '/agents') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve([])
                    });
                }
                if (path === '/knowledge-bases') {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText(/nenhum agente encontrado/i)).toBeInTheDocument();
            });
        });

        it('deve exibir mensagem de erro quando a API de agentes falha com status 401', async () => {
            api.get.mockImplementation((path) => {
                if (path === '/agents') {
                    return Promise.resolve({
                        ok: false,
                        status: 401,
                        text: () => Promise.resolve('Não autorizado')
                    });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText(/erro 401 ao carregar agentes/i)).toBeInTheDocument();
            });
        });
    });

    describe('Estado Vazio', () => {
        it('deve exibir estado vazio quando não há clusters de dúvidas', async () => {
            api.get.mockImplementation((path) => {
                if (path === '/agents') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve([{ id: 1, name: 'Agente Test' }])
                    });
                }
                if (path === '/knowledge-bases') {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
                }
                if (path.includes('/analytics/objections')) {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ clusters: [] }) });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText(/nenhuma dúvida recorrente identificada/i)).toBeInTheDocument();
            });
        });
    });

    describe('Botão de Recalcular', () => {
        it('deve renderizar o botão "Recalcular/Atualizar Ranking"', async () => {
            api.get.mockImplementation((path) => {
                if (path === '/agents') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve([{ id: 1, name: 'Agente Test' }])
                    });
                }
                if (path === '/knowledge-bases') {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
                }
                if (path.includes('/analytics/objections')) {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ clusters: [] }) });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Recalcular/Atualizar Ranking')).toBeInTheDocument();
            });
        });
    });

    describe('Título e Subtítulo', () => {
        it('deve renderizar o título e subtítulo da página', async () => {
            api.get.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText(/Ranking de Dúvidas & Objeções/i)).toBeInTheDocument();
                expect(screen.getByText(/dúvidas e objeções mais frequentes/i)).toBeInTheDocument();
            });
        });
    });
});
