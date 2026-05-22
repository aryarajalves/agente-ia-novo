import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import TranscriptionHistory from '../../components/TranscriptionHistory';
import { uploadManager } from '../../api/uploadManager';

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

// Mock do uploadManager
vi.mock('../../api/uploadManager', () => {
    let mockUploads = [];
    let listener = null;
    return {
        uploadManager: {
            getActiveUploads: vi.fn(() => mockUploads),
            subscribe: vi.fn((l) => {
                listener = l;
                l(mockUploads);
                return () => { listener = null; };
            }),
            startUpload: vi.fn((kbId, file, config) => {
                const id = 'test-upload-id';
                mockUploads = [{
                    id,
                    filename: file.name,
                    progress: 25,
                    status: 'uploading',
                    created_at: new Date().toISOString()
                }];
                if (listener) listener([...mockUploads]);
                return id;
            }),
            removeUpload: vi.fn((id) => {
                mockUploads = mockUploads.filter(u => u.id !== id);
                if (listener) listener([...mockUploads]);
            }),
            // Helper para testes simularem falhas/sucessos diretamente
            _setMockUploads: (uploads) => {
                mockUploads = uploads;
                if (listener) listener([...mockUploads]);
            }
        }
    };
});

describe('TranscriptionHistory - Fluxo de Upload Direto', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset dos mockUploads no mock
        act(() => {
            uploadManager._setMockUploads([]);
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('deve renderizar o botão de "Upload de Vídeo" no Header e não renderizar "Nova Transcrição Manual"', () => {
        render(<TranscriptionHistory />);
        const uploadBtn = screen.getByText(/Upload de Vídeo/i);
        expect(uploadBtn).toBeInTheDocument();

        const manualBtn = screen.queryByText(/Nova Transcrição Manual/i);
        expect(manualBtn).toBeNull();
    });

    it('deve disparar o input de arquivo ao clicar no botão "Upload de Vídeo"', () => {
        render(<TranscriptionHistory />);
        const input = screen.getByAccept = (accept) => accept === 'video/*,audio/*';
        expect(input).toBeDefined();
    });

    it('deve simular o início de um upload e renderizar a linha de progresso na tabela', async () => {
        render(<TranscriptionHistory />);
        
        // Simular a adição de um upload ativo diretamente no mock
        act(() => {
            uploadManager._setMockUploads([
                {
                    id: 'active-1',
                    filename: 'video_teste.mp4',
                    progress: 45,
                    status: 'uploading',
                    created_at: new Date().toISOString()
                }
            ]);
        });

        // O empty state deve sumir e a tabela deve listar o item ativo
        expect(screen.queryByText(/Histórico Vazio/i)).not.toBeInTheDocument();
        
        const filenameText = screen.getByText('video_teste.mp4');
        expect(filenameText).toBeInTheDocument();

        const progressBadge = screen.getByText(/Enviando 45%/i);
        expect(progressBadge).toBeInTheDocument();
    });

    it('deve renderizar erro e permitir a remoção caso o upload falhe', () => {
        render(<TranscriptionHistory />);
        
        // Simular um upload com erro
        act(() => {
            uploadManager._setMockUploads([
                {
                    id: 'error-1',
                    filename: 'video_com_falha.mp4',
                    progress: 0,
                    status: 'error',
                    error: 'Erro de rede ao enviar para o storage',
                    created_at: new Date().toISOString()
                }
            ]);
        });

        const filenameText = screen.getByText('video_com_falha.mp4');
        expect(filenameText).toBeInTheDocument();

        const errorBadge = screen.getByText(/Erro no Envio/i);
        expect(errorBadge).toBeInTheDocument();

        // Botão para remover erro deve estar presente
        const removeErrorBtn = screen.getByTitle(/Remover erro/i);
        expect(removeErrorBtn).toBeInTheDocument();

        // Simula o clique para remover o erro
        fireEvent.click(removeErrorBtn);
        expect(uploadManager.removeUpload).toHaveBeenCalledWith('error-1');
    });

    it('deve renderizar status amigável de enviado quando o upload for concluído com sucesso', () => {
        render(<TranscriptionHistory />);
        
        // Simular um upload completo
        act(() => {
            uploadManager._setMockUploads([
                {
                    id: 'success-1',
                    filename: 'video_com_sucesso.mp4',
                    progress: 100,
                    status: 'completed',
                    created_at: new Date().toISOString()
                }
            ]);
        });

        const filenameText = screen.getByText('video_com_sucesso.mp4');
        expect(filenameText).toBeInTheDocument();

        // Não deve mostrar erro no envio
        expect(screen.queryByText(/Erro no Envio/i)).toBeNull();

        // Deve mostrar o status amigável de enviado
        const statusBadge = screen.getByText(/Enviado/i);
        expect(statusBadge).toBeInTheDocument();
    });

    it('deve registrar o listener beforeunload e impedir a saída da página se houver uploads em andamento', () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener');
        const removeEventSpy = vi.spyOn(window, 'removeEventListener');
        
        const { unmount } = render(<TranscriptionHistory />);
        
        // Deve registrar o evento beforeunload
        expect(addEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        
        // Pega a função de handler registrada
        const handleBeforeUnload = addEventSpy.mock.calls.find(c => c[0] === 'beforeunload')[1];
        
        // Simular uploads ativos
        act(() => {
            uploadManager._setMockUploads([
                {
                    id: 'active-1',
                    filename: 'video_teste.mp4',
                    progress: 45,
                    status: 'uploading',
                    created_at: new Date().toISOString()
                }
            ]);
        });
        
        // Disparar o manipulador fictício
        const eventMock = {
            preventDefault: vi.fn(),
            returnValue: ''
        };
        
        handleBeforeUnload(eventMock);
        
        // Deve bloquear o unload se houver upload ativo
        expect(eventMock.preventDefault).toHaveBeenCalled();
        expect(eventMock.returnValue).toContain('uploads de arquivos em andamento');
        
        // Limpar uploads ativos
        act(() => {
            uploadManager._setMockUploads([]);
        });
        
        const eventMock2 = {
            preventDefault: vi.fn(),
            returnValue: ''
        };
        handleBeforeUnload(eventMock2);
        
        // Não deve bloquear se não houver upload ativo
        expect(eventMock2.preventDefault).not.toHaveBeenCalled();
        
        // Desmontar componente deve remover o listener
        unmount();
        expect(removeEventSpy).toHaveBeenCalledWith('beforeunload', handleBeforeUnload);
        
        addEventSpy.mockRestore();
        removeEventSpy.mockRestore();
    });
});
