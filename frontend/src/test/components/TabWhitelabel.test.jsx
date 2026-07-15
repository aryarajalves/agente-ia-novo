/**
 * @file TabWhitelabel.test.jsx
 * @description Testes unitários para a aba Whitelabel do ConfigPanel.
 * Cobre: seletores de cor e cópia de snippet com toast.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock do contexto de configuração
vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => ({
        id: '42',
        initialMessage: '',
        uiPrimaryColor: '#6366f1',
        setUiPrimaryColor: vi.fn(),
        uiHeaderColor: '#0f172a',
        setUiHeaderColor: vi.fn(),
        uiChatTitle: 'Suporte IA',
        setUiChatTitle: vi.fn(),
        uiWelcomeMessage: 'Olá! Como posso ajudar?',
        showWhitelabelGuide: false,
        setShowWhitelabelGuide: vi.fn(),
    }),
}));

// Mock do WhitelabelGuideModal
vi.mock('../../components/ConfigPanel/components/Modals/WhitelabelGuideModal', () => ({
    default: ({ isOpen }) => isOpen ? <div data-testid="guide-modal">Modal</div> : null,
}));

// Mock do WidgetPreview
vi.mock('../../components/ConfigPanel/components/Shared/WidgetPreview', () => ({
    default: ({ chatTitle }) => <div data-testid="widget-preview">{chatTitle}</div>,
}));

// Mock do config
vi.mock('../../config', () => ({
    API_URL: 'https://backendagente.aryaraj.shop',
}));

import TabWhitelabel from '../../components/ConfigPanel/components/TabWhitelabel';

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────

const renderComponent = () => render(<TabWhitelabel />);

// A partir da introdução das sub-abas (Aparência/Instalação/Preview), o conteúdo de
// cada seção só fica no DOM quando sua sub-aba está ativa — precisamos trocar para
// "Instalação" antes de testar o snippet/botão de copiar.
const goToInstallTab = () => {
    fireEvent.click(screen.getByText(/Instalação/i));
};

// ────────────────────────────────────────────────────────────────────────────────
// Testes
// ────────────────────────────────────────────────────────────────────────────────

describe('TabWhitelabel — Seletores de Cor', () => {
    it('deve renderizar o seletor de cor primária (.color-swatch) e o input hexadecimal separados', () => {
        renderComponent();

        const swatches = document.querySelectorAll('.color-swatch');
        const hexInputs = document.querySelectorAll('.color-hex-input');

        expect(swatches.length).toBeGreaterThanOrEqual(2);
        expect(hexInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('deve exibir o valor da cor primária no input hexadecimal', () => {
        renderComponent();

        const hexInputs = document.querySelectorAll('.color-hex-input');
        const primaryInput = hexInputs[0];
        expect(primaryInput.value).toBe('#6366f1');
    });

    it('deve exibir o valor da cor do cabeçalho no segundo input hexadecimal', () => {
        renderComponent();

        const hexInputs = document.querySelectorAll('.color-hex-input');
        const headerInput = hexInputs[1];
        expect(headerInput.value).toBe('#0f172a');
    });

    it('deve ter labels visíveis para cada campo de cor', () => {
        renderComponent();

        expect(screen.getByText(/Cor Primária/i)).toBeInTheDocument();
        expect(screen.getByText(/Cor do Cabeçalho/i)).toBeInTheDocument();
    });
});

describe('TabWhitelabel — Copiar Snippet', () => {
    let dispatchSpy;
    let clipboardSpy;

    beforeEach(() => {
        dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve renderizar o botão de copiar código com a classe copy-btn-floating', () => {
        renderComponent();
        goToInstallTab();

        const copyBtn = document.getElementById('whitelabel-copy-btn');
        expect(copyBtn).toBeInTheDocument();
        expect(copyBtn).toHaveClass('copy-btn-floating');
    });

    it('deve copiar o snippet para a área de transferência ao clicar em Copiar', async () => {
        renderComponent();
        goToInstallTab();

        const copyBtn = document.getElementById('whitelabel-copy-btn');
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(clipboardSpy).toHaveBeenCalledOnce();
        const copiedText = clipboardSpy.mock.calls[0][0];
        expect(copiedText).toContain('data-agent-id="42"');
        expect(copiedText).toContain('data-primary-color="#6366f1"');
    });

    it('deve disparar o evento app:toast com type=success ao copiar com sucesso', async () => {
        renderComponent();
        goToInstallTab();

        const copyBtn = document.getElementById('whitelabel-copy-btn');
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        await waitFor(() => {
            const toastEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'app:toast'
            )?.[0];
            expect(toastEvent).toBeDefined();
            expect(toastEvent.detail.type).toBe('success');
            expect(toastEvent.detail.message).toMatch(/copiado/i);
        });
    });

    it('deve disparar o evento app:toast com type=error quando a clipboard falha', async () => {
        clipboardSpy.mockRejectedValueOnce(new Error('Permission denied'));
        renderComponent();
        goToInstallTab();

        const copyBtn = document.getElementById('whitelabel-copy-btn');
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        await waitFor(() => {
            const toastEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'app:toast'
            )?.[0];
            expect(toastEvent).toBeDefined();
            expect(toastEvent.detail.type).toBe('error');
        });
    });

    it('não deve renderizar o botão de Testar Widget', () => {
        renderComponent();
        expect(document.getElementById('whitelabel-test-btn')).not.toBeInTheDocument();
    });
});

describe('TabWhitelabel — Guia do Whitelabel', () => {
    it('deve renderizar o botão de Guia do Whitelabel', () => {
        renderComponent();

        const guideBtn = screen.getByText(/Guia do Whitelabel/i);
        expect(guideBtn).toBeInTheDocument();
    });
});
