import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutomationPipelineModal from '../../components/WebhookManager/components/AutomationPipelineModal';

vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:5000'
}));

describe('Reproduzir bug do botao atualizar pipeline', () => {
    let mockOnClose;

    beforeEach(() => {
        mockOnClose = vi.fn();
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    status: 'processing',
                    processing_steps: JSON.stringify([{ step: 'Novo Passo', detail: 'x', timestamp: new Date().toISOString() }]),
                    agent_response: null,
                    updated_at: new Date().toISOString(),
                    scheduled_at: null,
                    created_at: '2026-05-18T10:07:22Z',
                    server_now: new Date().toISOString()
                })
            })
        );
        global.WebSocket = vi.fn(() => ({ close: vi.fn(), onmessage: null }));
    });

    it('com webhook_config_id presente: clique deve chamar fetch', async () => {
        const mockEvent = {
            id: 1,
            webhook_config_id: 10,
            status: 'processing',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([])
        };
        render(<AutomationPipelineModal event={mockEvent} onClose={mockOnClose} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const callsBefore = global.fetch.mock.calls.length;
        const btn = screen.getByTitle('Atualizar pipeline');
        fireEvent.click(btn);
        await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('SEM webhook_config_id (undefined): clique NAO deve chamar fetch nem girar', async () => {
        const mockEvent = {
            id: 1,
            // webhook_config_id ausente de propósito
            status: 'processing',
            created_at: '2026-05-18T10:07:22Z',
            processing_steps: JSON.stringify([])
        };
        render(<AutomationPipelineModal event={mockEvent} onClose={mockOnClose} />);
        const callsBefore = global.fetch.mock.calls.length;
        const btn = screen.getByTitle('Atualizar pipeline');
        const svg = btn.querySelector('svg');
        fireEvent.click(btn);
        await new Promise(r => setTimeout(r, 100));
        expect(global.fetch.mock.calls.length).toBe(callsBefore);
        expect(svg.style.animation).toBe('none');
    });
});
