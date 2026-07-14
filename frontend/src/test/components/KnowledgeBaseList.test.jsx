import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import KnowledgeBaseList from '../../components/KnowledgeBaseList';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API client
const mockBases = [
    {
        id: 1,
        name: 'Base de Teste Produto',
        kb_type: 'product',
        description: 'Descrição de produto teste',
        items: [{ id: 101 }]
    },
    {
        id: 2,
        name: 'Base de Teste QA',
        kb_type: 'qa',
        description: 'Descrição de qa teste',
        items: [{ id: 201 }, { id: 202 }]
    }
];

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn((path) => {
            if (path === '/knowledge-bases') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBases)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }),
        delete: vi.fn(() => Promise.resolve({ ok: true })),
        post: vi.fn(() => Promise.resolve({ ok: true }))
    }
}));

describe('KnowledgeBaseList - Visual Improvement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar os cards das bases de conhecimento com as classes de estilo novas', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        // Aguarda a busca assíncrona
        const titleProduct = await screen.findByText('Base de Teste Produto');
        const titleQA = await screen.findByText('Base de Teste QA');

        expect(titleProduct).toBeInTheDocument();
        expect(titleQA).toBeInTheDocument();

        // Verifica se os ícones do wrapper estão renderizados correspondendo ao tipo
        expect(screen.getAllByText('📦').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('💬').length).toBeGreaterThanOrEqual(1);

        // Verifica se a quantidade correta de itens é renderizada
        expect(screen.getByText('1')).toBeInTheDocument(); // Itens da base 1
        expect(screen.getByText('2')).toBeInTheDocument(); // Itens da base 2
    });
});
