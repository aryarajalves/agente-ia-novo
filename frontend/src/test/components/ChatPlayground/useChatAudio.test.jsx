import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '../../../components/ChatPlayground/hooks/useChat';
import { api } from '../../../api/client';

// Mock do cliente de API
vi.mock('../../../api/client', () => ({
    api: {
        post: vi.fn(),
        upload: vi.fn(),
    },
}));

describe('useChat Hook - Gravação de Áudio', () => {
    const showToastMock = vi.fn();
    const setTesterSentimentMock = vi.fn();
    const setHasTesterReportMock = vi.fn();
    const setTesterReportMock = vi.fn();
    const onMessageSentMock = vi.fn();

    const mockArgs = {
        selectedAgentId: 4,
        sessionId: 'session-123',
        setSessionId: vi.fn(),
        challengerAgentId: null,
        isBattleMode: false,
        mainModelOverride: null,
        challengerModelOverride: null,
        showHotfix: false,
        hotfixPrompt: '',
        showChallengerHotfix: false,
        challengerHotfixPrompt: '',
        contextVars: {},
        showToast: showToastMock,
        setTesterSentiment: setTesterSentimentMock,
        setHasTesterReport: setHasTesterReportMock,
        setTesterReport: setTesterReportMock,
        onMessageSent: onMessageSentMock,
    };

    // Mocks para MediaRecorder e getUserMedia
    const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
    };

    class MockMediaRecorder {
        constructor(stream, options) {
            this.stream = stream;
            this.options = options;
            this.state = 'inactive';
        }
        start() {
            this.state = 'recording';
            if (this.onstart) this.onstart();
        }
        stop() {
            this.state = 'inactive';
            // Simula disponibilizar dados e parar
            if (this.ondataavailable) {
                const dummyBlob = new Blob([new ArrayBuffer(2000)], { type: 'audio/webm' });
                this.ondataavailable({ data: dummyBlob });
            }
            if (this.onstop) this.onstop();
        }
    }

    class MockSpeechRecognition {
        constructor() {
            this.continuous = false;
            this.interimResults = false;
            this.lang = '';
        }
        start = vi.fn();
        stop = vi.fn();
    }

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock do MediaRecorder global
        global.MediaRecorder = MockMediaRecorder;
        global.MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

        // Mock de SpeechRecognition e webkitSpeechRecognition
        global.SpeechRecognition = MockSpeechRecognition;
        global.webkitSpeechRecognition = MockSpeechRecognition;

        // Mock de navigator.mediaDevices
        global.navigator.mediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue(mockStream),
        };
    });

    it('deve iniciar e parar a gravação com sucesso', async () => {
        api.upload.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ text: 'Transcrição de áudio com sucesso', audio_url: 'http://test/uploads/recording.webm' }),
        });

        // Mock executeAgent
        api.post.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: 'Resposta do agente',
                cost_brl: 0.01,
                input_tokens: 10,
                output_tokens: 10,
                model_used: 'gpt-4o-mini',
            }),
        });

        const { result } = renderHook(() => useChat(mockArgs));

        // 1. Iniciar gravação
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        expect(result.current.isRecording).toBe(true);
        expect(showToastMock).toHaveBeenCalledWith('Gravando áudio...', 'info');

        // 2. Parar gravação
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        expect(result.current.isRecording).toBe(false);
        expect(api.upload).toHaveBeenCalled();
        
        // Espera a transcrição e o envio da mensagem
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        expect(showToastMock).toHaveBeenCalledWith('Áudio transcrito com sucesso!', 'success');
    });

    it('deve exibir erro se a gravação/upload falhar', async () => {
        api.upload.mockRejectedValue(new Error('Erro de upload'));

        const { result } = renderHook(() => useChat(mockArgs));

        // Iniciar
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        // Parar
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        // Espera tratamento do erro
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        expect(showToastMock).toHaveBeenCalledWith('Falha ao transcrever áudio: Erro de upload', 'error');
        expect(result.current.loading).toBe(false);
    });

    it('deve instanciar SpeechRecognition e atualizar o input ao falar', async () => {
        let recognitionInstance;
        class MockSpeechRecognitionWithResult {
            constructor() {
                this.continuous = false;
                this.interimResults = false;
                this.lang = '';
                recognitionInstance = this;
            }
            start = vi.fn();
            stop = vi.fn();
        }
        global.SpeechRecognition = MockSpeechRecognitionWithResult;

        api.upload.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ text: 'Texto do Whisper', audio_url: 'http://test/uploads/recording.webm' }),
        });

        api.post.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: 'Resposta do agente',
                cost_brl: 0.01,
                input_tokens: 10,
                output_tokens: 10,
                model_used: 'gpt-4o-mini',
            }),
        });

        const { result } = renderHook(() => useChat(mockArgs));

        // 1. Iniciar gravação
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        expect(result.current.isRecording).toBe(true);
        expect(recognitionInstance).toBeDefined();
        expect(recognitionInstance.start).toHaveBeenCalled();

        // Simular o evento onresult da SpeechRecognition
        await act(async () => {
            recognitionInstance.onresult({
                resultIndex: 0,
                results: [
                    {
                        isFinal: true,
                        0: { transcript: 'Texto falado em tempo real' }
                    }
                ]
            });
        });

        // O estado do input deve ter atualizado com o texto falado
        expect(result.current.input).toBe('Texto falado em tempo real');

        // 2. Parar gravação e esperar finalizar
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        expect(recognitionInstance.stop).toHaveBeenCalled();
        expect(result.current.isRecording).toBe(false);

        // Espera tratamento
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        expect(result.current.input).toBe(''); // Deve limpar o input ao finalizar com sucesso
    });

    it('deve parar a gravação de áudio silenciosamente e limpar recursos ao enviar uma mensagem pelo input', async () => {
        let recognitionInstance;
        class MockSpeechRecognitionWithResult {
            constructor() {
                this.continuous = false;
                this.interimResults = false;
                this.lang = '';
                recognitionInstance = this;
            }
            start = vi.fn();
            stop = vi.fn();
        }
        global.SpeechRecognition = MockSpeechRecognitionWithResult;

        api.post.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: 'Resposta do agente',
                cost_brl: 0.01,
                input_tokens: 10,
                output_tokens: 10,
                model_used: 'gpt-4o-mini',
            }),
        });

        const { result } = renderHook(() => useChat(mockArgs));

        // 1. Iniciar gravação
        await act(async () => {
            await result.current.handleVoiceRecord();
        });

        expect(result.current.isRecording).toBe(true);
        expect(recognitionInstance).toBeDefined();

        // 2. Simula o preenchimento de input e o envio da mensagem
        act(() => {
            result.current.setInput('Mensagem enviada manualmente');
        });

        // 3. Enviar mensagem via handleSendMessage
        await act(async () => {
            await result.current.handleSendMessage(null);
        });

        // 4. Deve parar a gravação e parar o recognition
        expect(result.current.isRecording).toBe(false);
        expect(recognitionInstance.stop).toHaveBeenCalled();
        
        // 5. Garante que api.upload NÃO foi chamada (gravação foi silenciada/cancelada)
        expect(api.upload).not.toHaveBeenCalled();
    });
});
