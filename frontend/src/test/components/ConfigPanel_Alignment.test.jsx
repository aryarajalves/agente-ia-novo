import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ConfigPanel from '../../components/ConfigPanel';

// Mocking dependencies to focus on style rendering
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        put: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    }
}));

import { MemoryRouter } from 'react-router-dom';

describe('ConfigPanel Alignment', () => {
    it('should have initial message textarea aligned to the left', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel id="1" onClose={() => {}} onUpdate={() => {}} />
            </MemoryRouter>
        );
        
        const promptsTab = screen.getByText(/Prompts & Identidade/i);
        promptsTab.click();

        const textarea = screen.getByPlaceholderText(/Ex: Olá! Eu sou o assistente virtual/i);
        
        expect(textarea.classList.contains('force-left-align')).toBe(true);
        expect(textarea.style.width).toBe('100%');
        expect(textarea.style.display).toBe('block');
    });

    it('should have initial question message textarea with force-left-align class', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel id="1" onClose={() => {}} onUpdate={() => {}} />
            </MemoryRouter>
        );
        
        const promptsTab = screen.getByText(/Prompts & Identidade/i);
        promptsTab.click();

        const questionTab = screen.getByText(/Se iniciar com Pergunta/i);
        questionTab.click();

        const textarea = screen.getByPlaceholderText(/Ex: Espero ter ajudado! Além disso/i);
        
        expect(textarea.classList.contains('force-left-align')).toBe(true);
        expect(textarea.style.width).toBe('100%');
        expect(textarea.style.display).toBe('block');
    });
});
