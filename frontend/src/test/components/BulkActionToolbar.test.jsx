import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BulkActionToolbar from '../../components/WebhookManager/components/BulkActionToolbar';

describe('BulkActionToolbar Component', () => {
    let onBulkDeleteMock;
    let onClearSelectionMock;
    let toggleSelectAllWebhooksMock;

    beforeEach(() => {
        onBulkDeleteMock = vi.fn();
        onClearSelectionMock = vi.fn();
        toggleSelectAllWebhooksMock = vi.fn();
    });

    it('não deve renderizar nada quando selectedWebhooks está vazio', () => {
        const { container } = render(
            <BulkActionToolbar
                selectedWebhooks={new Set()}
                webhooks={[]}
                toggleSelectAllWebhooks={toggleSelectAllWebhooksMock}
                onBulkDelete={onBulkDeleteMock}
                onClearSelection={onClearSelectionMock}
            />
        );
        expect(container.innerHTML).toBe('');
    });

    it('deve renderizar a contagem correta e os botões quando há itens selecionados', () => {
        const selected = new Set([1, 2]);
        const webhooks = [{ id: 1 }, { id: 2 }];

        render(
            <BulkActionToolbar
                selectedWebhooks={selected}
                webhooks={webhooks}
                toggleSelectAllWebhooks={toggleSelectAllWebhooksMock}
                onBulkDelete={onBulkDeleteMock}
                onClearSelection={onClearSelectionMock}
            />
        );

        expect(screen.getByText('2 integrações selecionadas')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
        expect(screen.getByText('Excluir Selecionadas')).toBeInTheDocument();
    });

    it('deve disparar onClearSelection ao clicar em Cancelar', () => {
        const selected = new Set([1]);
        const webhooks = [{ id: 1 }];

        render(
            <BulkActionToolbar
                selectedWebhooks={selected}
                webhooks={webhooks}
                toggleSelectAllWebhooks={toggleSelectAllWebhooksMock}
                onBulkDelete={onBulkDeleteMock}
                onClearSelection={onClearSelectionMock}
            />
        );

        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClearSelectionMock).toHaveBeenCalledTimes(1);
    });

    it('deve disparar onBulkDelete ao clicar em Excluir Selecionadas', () => {
        const selected = new Set([1]);
        const webhooks = [{ id: 1 }];

        render(
            <BulkActionToolbar
                selectedWebhooks={selected}
                webhooks={webhooks}
                toggleSelectAllWebhooks={toggleSelectAllWebhooksMock}
                onBulkDelete={onBulkDeleteMock}
                onClearSelection={onClearSelectionMock}
            />
        );

        fireEvent.click(screen.getByText('Excluir Selecionadas'));
        expect(onBulkDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('deve disparar toggleSelectAllWebhooks ao clicar em Selecionar Tudo', () => {
        const selected = new Set([1]);
        const webhooks = [{ id: 1 }];

        render(
            <BulkActionToolbar
                selectedWebhooks={selected}
                webhooks={webhooks}
                toggleSelectAllWebhooks={toggleSelectAllWebhooksMock}
                onBulkDelete={onBulkDeleteMock}
                onClearSelection={onClearSelectionMock}
            />
        );

        fireEvent.click(screen.getByText('Selecionar Tudo'));
        expect(toggleSelectAllWebhooksMock).toHaveBeenCalledTimes(1);
    });
});
