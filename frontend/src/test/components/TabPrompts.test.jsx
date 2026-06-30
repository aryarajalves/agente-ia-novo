import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TabPrompts from '../../components/ConfigPanel/components/TabPrompts';

// Mock do cliente API
const mockApi = {
    get: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['etiqueta1', 'etiqueta2'])
    })),
    post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
};

vi.mock('../../../api/client', () => ({
    api: mockApi
}));

// Mock do Contexto de Configuração
const mockSetQualificationQuestions = vi.fn();
const mockSetQualificationLabels = vi.fn();
const mockSetSystemPrompt = vi.fn();
const mockSetInitialMessage = vi.fn();
const mockSetInitialQuestionMessage = vi.fn();
const mockSetInitialIgnoreMessage = vi.fn();
const mockSetDateAwareness = vi.fn();
const mockSetSimulatedTime = vi.fn();

const mockConfigValues = {
    id: '1',
    isNew: false,
    systemPrompt: 'Prompt de teste',
    setSystemPrompt: mockSetSystemPrompt,
    routerEnabled: false,
    routerComplexModel: 'gpt-4o',
    selectedModel: 'gpt-4o-mini',
    initialMessage: 'Olá!',
    setInitialMessage: mockSetInitialMessage,
    initialQuestionMessage: 'Qual sua dúvida?',
    setInitialQuestionMessage: mockSetInitialQuestionMessage,
    initialIgnoreMessage: [],
    setInitialIgnoreMessage: mockSetInitialIgnoreMessage,
    qualificationQuestions: [
        { text: 'Qual seu nome?', instruction: 'Validar nome completo' },
        { text: 'Qual seu e-mail?', instruction: '' }
    ],
    setQualificationQuestions: mockSetQualificationQuestions,
    qualificationLabels: ['Lead-Qualificado'],
    setQualificationLabels: mockSetQualificationLabels,
    dateAwareness: false,
    setDateAwareness: mockSetDateAwareness,
    dateAwarenessPastDays: 7,
    setDateAwarenessPastDays: vi.fn(),
    dateAwarenessFutureDays: 7,
    setDateAwarenessFutureDays: vi.fn(),
    simulatedTime: '',
    setSimulatedTime: mockSetSimulatedTime,
    toolsList: [{ id: 'tool_qualif', name: 'lead_qualificado' }],
    selectedTools: ['tool_qualif']
};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

describe('TabPrompts Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset config questions
        mockConfigValues.qualificationQuestions = [
            { text: 'Qual seu nome?', instruction: 'Validar nome completo' },
            { text: 'Qual seu e-mail?', instruction: '' }
        ];
    });

    it('deve renderizar a lista de perguntas de qualificação corretamente', () => {
        render(<TabPrompts />);
        
        expect(screen.getByText('Qual seu nome?')).toBeInTheDocument();
        expect(screen.getByText('Qual seu e-mail?')).toBeInTheDocument();
        expect(screen.getByText('Validar nome completo')).toBeInTheDocument();
    });

    it('deve entrar no modo de edição inline ao clicar em uma pergunta', async () => {
        render(<TabPrompts />);
        
        const questionText = screen.getByText('Qual seu nome?');
        fireEvent.click(questionText);

        // O input de edição deve estar visível com o valor correspondente
        const input = screen.getByDisplayValue('Qual seu nome?');
        expect(input).toBeInTheDocument();

        // O accordion de instrução do agente também deve estar visível
        const labelInstrucao = screen.getByText(/Instrução para o Agente \(Opcional\):/i);
        expect(labelInstrucao).toBeInTheDocument();

        const textareaInstrucao = screen.getByDisplayValue('Validar nome completo');
        expect(textareaInstrucao).toBeInTheDocument();
    });

    it('deve salvar as edições de texto e instrução ao clicar em confirmar (✓)', () => {
        render(<TabPrompts />);
        
        const questionText = screen.getByText('Qual seu nome?');
        fireEvent.click(questionText);

        const input = screen.getByDisplayValue('Qual seu nome?');
        fireEvent.change(input, { target: { value: 'Qual seu nome completo?' } });

        const textareaInstrucao = screen.getByDisplayValue('Validar nome completo');
        fireEvent.change(textareaInstrucao, { target: { value: 'Exigir nome e sobrenome' } });

        const saveBtn = screen.getByTitle('Salvar alteração');
        fireEvent.click(saveBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith([
            { text: 'Qual seu nome completo?', instruction: 'Exigir nome e sobrenome' },
            { text: 'Qual seu e-mail?', instruction: '' }
        ]);
    });

    it('deve cancelar as edições e fechar os campos ao clicar em cancelar (✗)', () => {
        render(<TabPrompts />);
        
        const questionText = screen.getByText('Qual seu nome?');
        fireEvent.click(questionText);

        const cancelBtn = screen.getByTitle('Cancelar');
        fireEvent.click(cancelBtn);

        expect(screen.queryByDisplayValue('Qual seu nome?')).not.toBeInTheDocument();
        expect(screen.getByText('Qual seu nome?')).toBeInTheDocument();
        expect(mockSetQualificationQuestions).not.toHaveBeenCalled();
    });

    it('deve abrir o modal de confirmação de exclusão ao clicar no botão da lixeira', () => {
        render(<TabPrompts />);
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        // Modal deve estar visível
        expect(screen.getByText('Você tem certeza que deseja apagar esta pergunta qualificatória?')).toBeInTheDocument();
        expect(screen.getByText('"Qual seu nome?"')).toBeInTheDocument();
    });

    it('deve confirmar a exclusão ao clicar em sim no modal', () => {
        render(<TabPrompts />);
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        const confirmBtn = screen.getByText('Sim, Apagar');
        fireEvent.click(confirmBtn);

        expect(mockSetQualificationQuestions).toHaveBeenCalledWith([
            { text: 'Qual seu e-mail?', instruction: '' }
        ]);
        expect(screen.queryByText('Você tem certeza que deseja apagar esta pergunta qualificatória?')).not.toBeInTheDocument();
    });

    it('deve cancelar a exclusão ao clicar em cancelar no modal', () => {
        render(<TabPrompts />);
        
        const deleteButtons = screen.getAllByText('🗑️');
        fireEvent.click(deleteButtons[0]);

        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);

        expect(mockSetQualificationQuestions).not.toHaveBeenCalled();
        expect(screen.queryByText('Você tem certeza que deseja apagar esta pergunta qualificatória?')).not.toBeInTheDocument();
    });

    it('deve abrir o modal explicativo de consciência temporal ao clicar no botão de interrogação ❓', () => {
        render(<TabPrompts />);
        
        const helpBtn = screen.getByTitle('Saiba mais sobre a Consciência Temporal');
        expect(helpBtn).toBeInTheDocument();
        
        fireEvent.click(helpBtn);
        
        expect(screen.getByText(/Entendendo as Opções Temporais/)).toBeInTheDocument();
        expect(screen.getAllByText(/Ativar Consciência Temporal/).length).toBeGreaterThan(1);
        expect(screen.getByText(/Forçar Horário Específico/)).toBeInTheDocument();
    });
});
