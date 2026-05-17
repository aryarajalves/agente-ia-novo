/**
 * ========================================
 * TESTES UNITÁRIOS: DeleteMessageModal Component
 * ========================================
 * Valida todas as especificidades do modal de deleção:
 * 1. Não renderiza nada quando isOpen é false.
 * 2. Renderiza corretamente o título e a mensagem selecionada.
 * 3. Botão "Sim, Apagar" dispara o callback onConfirm.
 * 4. Botão "Cancelar" dispara o callback onCancel.
 * 5. Não fecha ao clicar fora (overlay não tem click handler).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DeleteMessageModal from '../../components/ConfigPanel/components/Modals/DeleteMessageModal';

describe('DeleteMessageModal Component', () => {
    let onConfirmMock;
    let onCancelMock;
    const testMessage = 'oiee! Qual sua dúvida sobre o Método Laser Day?';

    beforeEach(() => {
        onConfirmMock = vi.fn();
        onCancelMock = vi.fn();
    });

    // ===== VISIBILIDADE =====
    describe('Visibilidade e Renderização', () => {
        it('não deve renderizar nada quando isOpen é false', () => {
            const { container } = render(
                <DeleteMessageModal
                    isOpen={false}
                    messageText={testMessage}
                    onConfirm={onConfirmMock}
                    onCancel={onCancelMock}
                />
            );
            expect(container.innerHTML).toBe('');
        });

        it('deve renderizar o título e a mensagem de anúncio quando isOpen é true', () => {
            render(
                <DeleteMessageModal
                    isOpen={true}
                    messageText={testMessage}
                    onConfirm={onConfirmMock}
                    onCancel={onCancelMock}
                />
            );

            expect(screen.getByText('🗑️ Confirmar Exclusão')).toBeInTheDocument();
            expect(screen.getByText(new RegExp(testMessage, 'i'))).toBeInTheDocument();
            expect(screen.getByText('Você tem certeza que deseja apagar esta mensagem de anúncio?')).toBeInTheDocument();
        });
    });

    // ===== AÇÕES =====
    describe('Interações e Ações', () => {
        it('deve chamar o callback onConfirm ao clicar em "Sim, Apagar"', () => {
            render(
                <DeleteMessageModal
                    isOpen={true}
                    messageText={testMessage}
                    onConfirm={onConfirmMock}
                    onCancel={onCancelMock}
                />
            );

            const deleteButton = screen.getByText('Sim, Apagar');
            fireEvent.click(deleteButton);
            expect(onConfirmMock).toHaveBeenCalledTimes(1);
        });

        it('deve chamar o callback onCancel ao clicar em "Cancelar"', () => {
            render(
                <DeleteMessageModal
                    isOpen={true}
                    messageText={testMessage}
                    onConfirm={onConfirmMock}
                    onCancel={onCancelMock}
                />
            );

            const cancelButton = screen.getByText('Cancelar');
            fireEvent.click(cancelButton);
            expect(onCancelMock).toHaveBeenCalledTimes(1);
        });

        it('não deve disparar onCancel ao clicar no overlay de fundo (segurança de clique fora)', () => {
            render(
                <DeleteMessageModal
                    isOpen={true}
                    messageText={testMessage}
                    onConfirm={onConfirmMock}
                    onCancel={onCancelMock}
                />
            );

            const overlay = document.querySelector('.guide-modal-overlay');
            if (overlay) {
                fireEvent.click(overlay);
                expect(onCancelMock).not.toHaveBeenCalled();
            }
        });
    });
});
