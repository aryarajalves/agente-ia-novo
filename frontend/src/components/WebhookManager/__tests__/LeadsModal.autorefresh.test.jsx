/**
 * Testes para o auto-refresh do LeadsModal
 * Valida que o componente chama onRefresh automaticamente a cada 30 segundos.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeadsModal from '../components/LeadsModal';

// Mock do AutomationPipelineModal para evitar dependências
jest.mock('../components/AutomationPipelineModal', () => () => null);
jest.mock('../utils/helpers', () => ({
    formatDate: (d) => d || '',
}));

const makeLeadsModal = (overrides = {}) => ({
    webhook: { id: 1, name: 'WhatsApp' },
    leads: [],
    total: 0,
    loading: false,
    page: 1,
    pageSize: 20,
    search: '',
    podeEnviar: 'all',
    dateStart: '',
    dateEnd: '',
    janelaAberta: 'all',
    semMensagens: 'all',
    ...overrides,
});

describe('LeadsModal - Auto Refresh', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('mostra o indicador de auto-refresh quando onRefresh é passado', () => {
        const onRefresh = jest.fn();
        render(
            <LeadsModal
                leadsModal={makeLeadsModal()}
                onClose={jest.fn()}
                onSearch={jest.fn()}
                onFilterChange={jest.fn()}
                onPageChange={jest.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={jest.fn()}
                toggleSelectAllLeads={jest.fn()}
                onBulkDelete={jest.fn()}
                onDeleteLead={jest.fn()}
                onSyncAll={jest.fn()}
                onViewHistory={jest.fn()}
                onRefresh={onRefresh}
            />
        );

        // O indicador de countdown deve estar visível
        expect(screen.getByText(/Atualiza em/i)).toBeInTheDocument();
    });

    it('NÃO mostra o indicador quando onRefresh não é passado', () => {
        render(
            <LeadsModal
                leadsModal={makeLeadsModal()}
                onClose={jest.fn()}
                onSearch={jest.fn()}
                onFilterChange={jest.fn()}
                onPageChange={jest.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={jest.fn()}
                toggleSelectAllLeads={jest.fn()}
                onBulkDelete={jest.fn()}
                onDeleteLead={jest.fn()}
                onSyncAll={jest.fn()}
                onViewHistory={jest.fn()}
            />
        );

        expect(screen.queryByText(/Atualiza em/i)).not.toBeInTheDocument();
    });

    it('chama onRefresh após 30 segundos', async () => {
        const onRefresh = jest.fn();
        render(
            <LeadsModal
                leadsModal={makeLeadsModal()}
                onClose={jest.fn()}
                onSearch={jest.fn()}
                onFilterChange={jest.fn()}
                onPageChange={jest.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={jest.fn()}
                toggleSelectAllLeads={jest.fn()}
                onBulkDelete={jest.fn()}
                onDeleteLead={jest.fn()}
                onSyncAll={jest.fn()}
                onViewHistory={jest.fn()}
                onRefresh={onRefresh}
            />
        );

        // Avançar 30 segundos
        act(() => {
            jest.advanceTimersByTime(30000);
        });

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('chama onRefresh múltiplas vezes em intervalos de 30 segundos', () => {
        const onRefresh = jest.fn();
        render(
            <LeadsModal
                leadsModal={makeLeadsModal()}
                onClose={jest.fn()}
                onSearch={jest.fn()}
                onFilterChange={jest.fn()}
                onPageChange={jest.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={jest.fn()}
                toggleSelectAllLeads={jest.fn()}
                onBulkDelete={jest.fn()}
                onDeleteLead={jest.fn()}
                onSyncAll={jest.fn()}
                onViewHistory={jest.fn()}
                onRefresh={onRefresh}
            />
        );

        // Avançar 90 segundos = 3 refreshes
        act(() => {
            jest.advanceTimersByTime(90000);
        });

        expect(onRefresh).toHaveBeenCalledTimes(3);
    });

    it('mostra o contador regressivo decrementando', () => {
        const onRefresh = jest.fn();
        render(
            <LeadsModal
                leadsModal={makeLeadsModal()}
                onClose={jest.fn()}
                onSearch={jest.fn()}
                onFilterChange={jest.fn()}
                onPageChange={jest.fn()}
                selectedLeads={new Set()}
                toggleSelectLead={jest.fn()}
                toggleSelectAllLeads={jest.fn()}
                onBulkDelete={jest.fn()}
                onDeleteLead={jest.fn()}
                onSyncAll={jest.fn()}
                onViewHistory={jest.fn()}
                onRefresh={onRefresh}
            />
        );

        // Começa em 30
        expect(screen.getByText(/Atualiza em 30s/i)).toBeInTheDocument();

        // Após 5 segundos deve mostrar 25
        act(() => {
            jest.advanceTimersByTime(5000);
        });

        expect(screen.getByText(/Atualiza em 25s/i)).toBeInTheDocument();
    });
});
