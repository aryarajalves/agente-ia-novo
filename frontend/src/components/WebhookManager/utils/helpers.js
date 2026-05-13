import { API_URL } from '../../../config';

export const showToast = (message, type = 'success') => {
    const event = new CustomEvent('app:toast', { detail: { message, type } });
    window.dispatchEvent(event);
};

export const normalizeContact = (v) => {
    const trimmed = v.trim();
    if (/[a-zA-Z]/.test(trimmed)) {
        return trimmed;
    }
    if (/\d/.test(trimmed)) {
        return trimmed.replace(/\D/g, '');
    }
    return trimmed;
};

export const generateToken = () => {
    return Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
};

export const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    try {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            const utcStr = dateInput.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateInput) ? dateInput : dateInput + 'Z';
            date = new Date(utcStr);
        }
        return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
        return typeof dateInput === 'string' ? dateInput : '-';
    }
};

export const getReceiveUrl = (token) => `${API_URL}/webhooks/receive/${token}`;
export const getMemoryUrl = (token, memoryToken) => `${API_URL}/webhooks/memory/${memoryToken || token}`;
