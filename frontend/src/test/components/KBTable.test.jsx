import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KBTable from '../../components/KnowledgeBaseManager/components/KBTable';
import React from 'react';

// Mock values
const mockItems = [
    {
        id: 1,
        question: 'O que é RAG?',
        answer: 'RAG significa Retrieval-Augmented Generation.',
        category: 'Geral',
        metadata_val: 'IA | NLP',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
        originalIndex: 0
    }
];

const mockOnUpdate = vi.fn();

// Mock do KBContext
vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: vi.fn(() => ({
        kbFilterTerm: '',
        setKbFilterTerm: vi.fn(),
        selectedItems: new Set(),
        kbLabels: { question: 'Pergunta', answer: 'Resposta', metadata: 'Metadado' },
        setItemToDelete: vi.fn(),
        setIsConfirmOpen: vi.fn(),
        itemsPerPage: 20,
        setItemsPerPage: vi.fn(),
        typeFilter: 'all',
        setTypeFilter: vi.fn(),
        currentPage: 1,
        setCurrentPage: vi.fn(),
        onUpdate: mockOnUpdate
    }))
}));

// Mock do KBData
vi.mock('../../components/KnowledgeBaseManager/hooks/useKBData', () => ({
    useKBData: vi.fn(() => ({
        paginatedItems: mockItems,
        totalPages: 1,
        totalCount: 1
    }))
}));

// Mock do KBOperations
vi.mock('../../components/KnowledgeBaseManager/hooks/useKBOperations', () => ({
    useKBOperations: vi.fn(() => ({
        toggleSelect: vi.fn(),
        toggleSelectAll: vi.fn()
    }))
}));

describe('KBTable - Ações e Modal de Detalhes com Vetor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar botões estilizados de ações e exibir modal de detalhes ao clicar', async () => {
        render(<KBTable />);

        // Verifica se a tabela e o conteúdo foram renderizados
        expect(screen.getByText('O que é RAG?')).toBeInTheDocument();
        
        // Verifica o botão de detalhes estilizado
        const detailButton = screen.getByRole('button', { name: /👁️ Ver Detalhes/i });
        expect(detailButton).toBeInTheDocument();

        // Clica para ver detalhes
        fireEvent.click(detailButton);

        // Verifica se o modal abriu e exibe as informações completas
        expect(screen.getByText('Detalhes do Conhecimento')).toBeInTheDocument();
        expect(screen.getAllByText(/Retrieval-Augmented Generation/i).length).toBe(2);
        expect(screen.getByText('IA')).toBeInTheDocument();
        expect(screen.getByText('NLP')).toBeInTheDocument();

        // Verifica se exibe o texto de embedding
        expect(screen.getByText(/Vetor de Embedding/i)).toBeInTheDocument();
        expect(screen.getAllByText(/dimensões/i).length).toBeGreaterThanOrEqual(1);
    });

    it('deve abrir modal de edição ao clicar no botão de editar, permitir alteração e submeter dados', async () => {
        render(<KBTable />);

        // Localiza e clica no botão "✏️ Editar"
        const editButton = screen.getByRole('button', { name: /✏️ Editar/i });
        expect(editButton).toBeInTheDocument();
        fireEvent.click(editButton);

        // Verifica se o modal de edição abriu
        expect(screen.getByText('✏️ Editar Conhecimento')).toBeInTheDocument();

        // Verifica se os inputs contêm os dados antigos
        const questionInput = screen.getByPlaceholderText(/Qual o horário de funcionamento/i);
        expect(questionInput.value).toBe('O que é RAG?');

        // Altera o valor da pergunta
        fireEvent.change(questionInput, { target: { value: 'O que RAG significa?' } });
        expect(questionInput.value).toBe('O que RAG significa?');

        // Clica em confirmar edição
        const confirmButton = screen.getByRole('button', { name: /✓ Confirmar Edição/i });
        fireEvent.click(confirmButton);

        // Verifica se onUpdate foi acionado com os valores atualizados
        expect(mockOnUpdate).toHaveBeenCalledWith(
            1,
            'O que RAG significa?',
            'RAG significa Retrieval-Augmented Generation.',
            'Geral',
            'IA | NLP'
        );
    });
});
