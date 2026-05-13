import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEvents } from '../components/WebhookManager/hooks/useEvents';

vi.mock('../api/client', () => ({
    api: {
        get: vi.fn(),
    }
}));

describe('useEvents hook', () => {
    it('should return setSelectedWebhook function', () => {
        const { result } = renderHook(() => useEvents());
        expect(typeof result.current.setSelectedWebhook).toBe('function');
    });
});
