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
    it('should render ConfigPanel successfully', async () => {
        render(
            <MemoryRouter>
                <ConfigPanel id="1" onClose={() => {}} onUpdate={() => {}} />
            </MemoryRouter>
        );
        
        const promptsTab = screen.getByText(/Prompts & Identidade/i);
        expect(promptsTab).toBeDefined();
    });
});
