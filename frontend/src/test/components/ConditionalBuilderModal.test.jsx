import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConditionalBuilderModal from '../../components/PromptEditor/components/ConditionalBuilderModal';

describe('ConditionalBuilderModal Simulator', () => {
    const mockBuilder = {
        selectedVar: 'dia_semana',
        setSelectedVar: vi.fn(),
        condOperator: '==',
        setCondOperator: vi.fn(),
        condValue: 'sexta-feira',
        setCondValue: vi.fn(),
        addAndCondition: false,
        setAddAndCondition: vi.fn(),
        andVar: '',
        setAndVar: vi.fn(),
        andOperator: '==',
        setAndOperator: vi.fn(),
        andValue: '',
        setAndValue: vi.fn(),
        condTrueText: 'Hoje é sexta-feira! 🎉',
        setCondTrueText: vi.fn(),
        condFalseText: 'Não é sexta-feira.',
        setCondFalseText: vi.fn(),
        elifsList: [
            { id: 1, variable: 'dia_semana', operator: '==', value: 'sábado', trueText: 'Final de semana!' }
        ],
        condTitle: 'Condicional de Teste',
        setCondTitle: vi.fn(),
        handleStartConfigure: vi.fn(),
        handleAddElif: vi.fn(),
        handleRemoveElif: vi.fn(),
        handleUpdateElif: vi.fn(),
        renderValueInput: (v, val, setVal, id) => {
            if (v === 'dia_semana') {
                const dias = [
                    'segunda-feira', 'terça-feira', 'quarta-feira',
                    'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
                ];
                return (
                    <select id={id} value={val} onChange={(e) => setVal(e.target.value)}>
                        <option value="">Selecione o dia...</option>
                        {dias.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                );
            }
            return <input id={id} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Definir valor..." />;
        },
        getGeneratedSnippet: () => '# Condicional de Teste\n[IF:dia_semana == sexta-feira]\nHoje é sexta-feira! 🎉\n[ELIF:dia_semana == sábado]\nFinal de semana!\n[ELSE]\nNão é sexta-feira.\n[/IF]',
        temporalVars: [],
        allVars: [{ key: 'dia_semana' }],
    };

    it('deve renderizar a seção de simulador com as variáveis da condicional', () => {
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={() => {}}
                onDelete={() => {}}
                editMode={true}
                builder={mockBuilder}
                globalVarsList={[]}
            />
        );

        // Verifica o título do simulador
        expect(screen.getByText(/🧪 Simulador de Resultado/i)).toBeInTheDocument();

        // Verifica se o campo para preencher a variável 'dia_semana' (dropdown) está na tela por ID
        const selectField = document.getElementById('sim-value-input-dia_semana');
        expect(selectField).toBeInTheDocument();
    });

    it('deve simular o resultado correto baseado no valor inserido no input', async () => {
        render(
            <ConditionalBuilderModal
                show={true}
                onClose={() => {}}
                onSave={() => {}}
                onDelete={() => {}}
                editMode={true}
                builder={mockBuilder}
                globalVarsList={[]}
            />
        );

        const selectField = document.getElementById('sim-value-input-dia_semana');
        const resultDiv = screen.getByTestId('expected-result');
        
        // 1. Testa o caso padrão (Else)
        expect(resultDiv.textContent).toBe('Não é sexta-feira.');

        // 2. Testa o caso IF principal (verdadeiro)
        fireEvent.change(selectField, { target: { value: 'sexta-feira' } });
        expect(resultDiv.textContent).toBe('Hoje é sexta-feira! 🎉');

        // 3. Testa o caso ELIF
        fireEvent.change(selectField, { target: { value: 'sábado' } });
        expect(resultDiv.textContent).toBe('Final de semana!');
    });
});
