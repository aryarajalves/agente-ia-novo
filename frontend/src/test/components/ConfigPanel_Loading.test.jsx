import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ConfigPanel from '../../components/ConfigPanel';

// Mock dependencies
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => new Promise(() => {})), // Never resolves to keep loading state
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        put: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    }
}));

describe('ConfigPanel Loading State', () => {
    it('should display the loading overlay when data is being fetched', async () => {
        render(
            <MemoryRouter initialEntries={['/agent/1']}>
                <ConfigPanel />
            </MemoryRouter>
        );
        
        // Check for the loading message
        expect(screen.getByText(/Carregando Agente/i)).toBeInTheDocument();
        expect(screen.getByText(/Estamos preparando todas as ferramentas/i)).toBeInTheDocument();
        
        // Check for the icon
        expect(screen.getByText('🤖')).toBeInTheDocument();
        
        // Ensure main content is NOT visible
        expect(screen.queryByText('Geral')).not.toBeInTheDocument();
        expect(screen.queryByText('Comportamento')).not.toBeInTheDocument();
    });
});
