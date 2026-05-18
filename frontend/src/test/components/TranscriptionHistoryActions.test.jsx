import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import TranscriptionHistory from '../../components/TranscriptionHistory';

// Mock do cliente de API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tasks: [], total: 0 })
        })),
        post: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        })),
        put: vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        })),
    }
}));

describe('TranscriptionHistory - Paginação e Deleção Premium', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar o botão de lixeira para cada item no histórico', async () => {
        const { api } = await import('../../api/client');
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula1.mp4', status: 'SUCCESS', created_at: new Date().toISOString() },
                            { id: 2, filename: 'aula2.mp4', status: 'FAILURE', created_at: new Date().toISOString() }
                        ],
                        total: 2
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        const item1 = await screen.findByText('aula1.mp4');
        expect(item1).toBeInTheDocument();
        
        const deleteButtons = screen.getAllByTitle('Excluir transcrição');
        expect(deleteButtons).toHaveLength(2);
    });

    it('deve abrir o modal de confirmação de exclusão individual ao clicar na lixeira', async () => {
        const { api } = await import('../../api/client');
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula1.mp4', status: 'SUCCESS', created_at: new Date().toISOString() }
                        ],
                        total: 1
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        const deleteButtons = await screen.findAllByTitle('Excluir transcrição');
        fireEvent.click(deleteButtons[0]);
        
        const modalTitle = screen.getByText('Excluir Arquivo');
        expect(modalTitle).toBeInTheDocument();
        expect(screen.getAllByText(/aula1.mp4/)).toHaveLength(2);
    });

    it('deve remover o item do histórico e emitir Toast de sucesso ao confirmar exclusão individual', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { api } = await import('../../api/client');
        
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula1.mp4', status: 'SUCCESS', created_at: new Date().toISOString() }
                        ],
                        total: 1
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        const deleteButtons = await screen.findAllByTitle('Excluir transcrição');
        fireEvent.click(deleteButtons[0]);
        
        const confirmBtn = screen.getByText('Sim, Excluir');
        
        api.post.mockImplementationOnce(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
        }));
        
        await act(async () => {
            fireEvent.click(confirmBtn);
        });
        
        expect(api.post).toHaveBeenCalledWith('/transcription-tasks/bulk-delete', { task_ids: [1] });
        
        const toastEvent = dispatchSpy.mock.calls.find(call => call[0].type === 'app:toast')[0];
        expect(toastEvent).toBeDefined();
        expect(toastEvent.detail.message).toBe('Transcrição excluída com sucesso!');
        expect(toastEvent.detail.type).toBe('success');
        
        dispatchSpy.mockRestore();
    });

    it('deve renderizar o dropdown de limite por página com opções 20, 50, 100', async () => {
        const { api } = await import('../../api/client');
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula1.mp4', status: 'SUCCESS', created_at: new Date().toISOString() }
                        ],
                        total: 1
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        await screen.findByText('aula1.mp4');
        
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toBeInTheDocument();
        expect(selectElement.value).toBe('20');
        
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
        expect(options[0].value).toBe('20');
        expect(options[1].value).toBe('50');
        expect(options[2].value).toBe('100');
    });

    it('deve renderizar o botão 📝 somente para tarefas SUCCESS e abrir o modal de visualização ao clicar', async () => {
        const { api } = await import('../../api/client');
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula_sucesso.mp4', status: 'SUCCESS', result_text: 'Olá, isso é uma transcrição premium.', created_at: new Date().toISOString() },
                            { id: 2, filename: 'aula_erro.mp4', status: 'FAILURE', created_at: new Date().toISOString() }
                        ],
                        total: 2
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        await screen.findByText('aula_sucesso.mp4');
        expect(screen.getByText('aula_erro.mp4')).toBeInTheDocument();
        
        // Deve existir apenas 1 botão 📝 (já que apenas aula_sucesso.mp4 é SUCCESS)
        const viewButtons = screen.getAllByTitle('Visualizar transcrição');
        expect(viewButtons).toHaveLength(1);
        
        // Clicar no botão 📝 deve abrir o modal
        fireEvent.click(viewButtons[0]);
        
        const modalTitle = screen.getByText('Transcrição Concluída');
        expect(modalTitle).toBeInTheDocument();
        
        const transcriptionText = screen.getByText('Olá, isso é uma transcrição premium.');
        expect(transcriptionText).toBeInTheDocument();
    });

    it('deve permitir copiar o texto transcrito ao clicar no botão Copiar e fechar ao clicar em Fechar', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const clipboardMock = vi.fn().mockImplementation(() => Promise.resolve());
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: clipboardMock
            }
        });

        const { api } = await import('../../api/client');
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula_sucesso.mp4', status: 'SUCCESS', result_text: 'Olá, isso é uma transcrição premium.', created_at: new Date().toISOString() }
                        ],
                        total: 1
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        await screen.findByText('aula_sucesso.mp4');
        const viewBtn = screen.getByTitle('Visualizar transcrição');
        fireEvent.click(viewBtn);
        
        // Clicar em Copiar Texto
        const copyBtn = screen.getByText('📋 Copiar Texto');
        await act(async () => {
            fireEvent.click(copyBtn);
        });
        
        expect(clipboardMock).toHaveBeenCalledWith('Olá, isso é uma transcrição premium.');
        
        // Deve disparar Toast
        const toastEvent = dispatchSpy.mock.calls.find(call => call[0].type === 'app:toast')[0];
        expect(toastEvent).toBeDefined();
        expect(toastEvent.detail.message).toBe('Texto copiado para a área de transferência!');
        
        // Clicar em Fechar deve ocultar o modal
        const closeBtn = screen.getByText('Fechar');
        fireEvent.click(closeBtn);
        
        expect(screen.queryByText('Transcrição Concluída')).not.toBeInTheDocument();
        
        dispatchSpy.mockRestore();
    });

    it('deve renderizar o botão 🧠 de Treinamento e abrir o TrainingModal ao clicar, permitindo gerar, editar e salvar itens', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { api } = await import('../../api/client');
        
        // Mock de chamadas GET para pastas, bases de conhecimento e tarefas
        api.get.mockImplementation((url) => {
            if (url.includes('/transcription-folders')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('/knowledge-bases')) {
                return Promise.resolve({ 
                    ok: true, 
                    json: () => Promise.resolve([
                        { id: 10, name: 'Base Comercial', kb_type: 'qa' }
                    ]) 
                });
            }
            if (url.includes('/transcription-tasks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        tasks: [
                            { id: 1, filename: 'aula_vendas.mp4', status: 'SUCCESS', result_text: 'Excelente conteúdo de marketing digital.', created_at: new Date().toISOString() }
                        ],
                        total: 1
                    })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<TranscriptionHistory />);
        
        await screen.findByText('aula_vendas.mp4');
        
        // Deve renderizar o botão de treinamento 🧠
        const trainButtons = screen.getAllByTitle('Treinamento com IA');
        expect(trainButtons).toHaveLength(1);
        
        // Clicar no botão de treinamento 🧠 deve abrir o modal
        fireEvent.click(trainButtons[0]);
        
        const modalTitle = screen.getByText('Treinamento com IA');
        expect(modalTitle).toBeInTheDocument();
        expect(screen.getAllByText('aula_vendas.mp4').length).toBeGreaterThanOrEqual(1);

        // Deve renderizar o select de base e de quantidade
        const kbSelect = screen.getByDisplayValue('Selecione uma base...');
        expect(kbSelect).toBeInTheDocument();
        
        // Selecionar base com id 10
        fireEvent.change(kbSelect, { target: { value: '10' } });
        expect(kbSelect.value).toBe('10');

        // Mock do POST de geração de Q&A
        api.post.mockImplementation((url, body) => {
            if (url.includes('/generate-qa-from-transcription')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { pergunta: 'Qual é o foco?', resposta: 'O foco é marketing digital.', categoria: 'Treinamento' }
                    ])
                });
            }
            if (url.includes('/items/add-batch')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: 'Success' })
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        const generateBtn = screen.getByText(/Gerar Perguntas & Respostas com IA/i);
        await act(async () => {
            fireEvent.click(generateBtn);
        });

        // Deve exibir o card gerado
        const questionInput = screen.getByPlaceholderText('Digite a pergunta didática...');
        expect(questionInput).toBeInTheDocument();
        expect(questionInput.value).toBe('Qual é o foco?');

        const answerTextarea = screen.getByPlaceholderText('Digite a resposta que a IA usará como referência...');
        expect(answerTextarea).toBeInTheDocument();
        expect(answerTextarea.value).toBe('O foco é marketing digital.');

        // Alterar o campo de pergunta
        fireEvent.change(questionInput, { target: { value: 'Qual o foco atual?' } });
        expect(questionInput.value).toBe('Qual o foco atual?');

        // Adicionar card manual
        const addManualBtn = screen.getByText(/Adicionar Pergunta Manual/i);
        fireEvent.click(addManualBtn);
        
        const inputsAfterAdd = screen.getAllByPlaceholderText('Digite a pergunta didática...');
        expect(inputsAfterAdd).toHaveLength(2); // O gerado e o novo manual em branco

        // Preencher o manual
        fireEvent.change(inputsAfterAdd[1], { target: { value: 'Quem participou?' } });
        const textareasAfterAdd = screen.getAllByPlaceholderText('Digite a resposta que a IA usará como referência...');
        fireEvent.change(textareasAfterAdd[1], { target: { value: 'A equipe de vendas.' } });

        // Clicar em Salvar
        const saveBtn = screen.getByText(/Salvar na Base de Conhecimento/i);
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        // Deve chamar a API com a lista correta
        expect(api.post).toHaveBeenCalledWith('/knowledge-bases/10/items/add-batch', {
            items: [
                { question: 'Qual o foco atual?', answer: 'O foco é marketing digital.', category: 'Treinamento', metadata_val: 'Fonte: Transcrição - aula_vendas.mp4' },
                { question: 'Quem participou?', answer: 'A equipe de vendas.', category: 'Treinamento Manual', metadata_val: 'Fonte: Transcrição - aula_vendas.mp4' }
            ]
        });

        // O modal deve fechar e disparar Toast de sucesso
        expect(screen.queryByText('Treinamento com IA')).not.toBeInTheDocument();
        // Busca especificamente as chamadas com tipo 'app:toast'
        const toastEvents = dispatchSpy.mock.calls
            .map(call => call[0])
            .filter(event => event.type === 'app:toast');
        
        // Deve ter o toast de geração e depois o toast de salvamento
        expect(toastEvents.length).toBeGreaterThanOrEqual(2);
        
        const saveToast = toastEvents.find(e => e.detail.message.includes('integrado'));
        expect(saveToast).toBeDefined();
        expect(saveToast.detail.type).toBe('success');

        dispatchSpy.mockRestore();
    });
});
