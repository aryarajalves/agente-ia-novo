import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ConfigPanel from '../../components/ConfigPanel';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: '1' }),
        useLocation: () => ({ search: '' })
    };
});

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({ 
            ok: true, 
            json: () => Promise.resolve({ id: '1', name: 'Agente Teste', model: 'gpt-4o' }) 
        })),
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    }
}));

describe('ConfigPanel Navigation Header', () => {
    it('should display the header with back button, agent name and chat button', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel />
            </MemoryRouter>
        );
        
        // Wait for data to load
        const backBtn = await screen.findByText(/Voltar para Agentes/i);
        expect(backBtn).toBeInTheDocument();
        
        expect(screen.getByText(/Agente Teste/i)).toBeInTheDocument();
        expect(screen.getByText(/Ir para o Chat/i)).toBeInTheDocument();
    });

    it('should navigate to home when back button is clicked', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel />
            </MemoryRouter>
        );
        
        const backBtn = await screen.findByText(/Voltar para Agentes/i);
        fireEvent.click(backBtn);
        
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to playground when chat button is clicked', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel />
            </MemoryRouter>
        );
        
        const chatBtn = await screen.findByText(/Ir para o Chat/i);
        fireEvent.click(chatBtn);
        
        expect(mockNavigate).toHaveBeenCalledWith('/playground?agentId=1');
    });
});
