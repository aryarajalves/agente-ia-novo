import { useEffect, useCallback } from 'react';
import { useSupport } from '../SupportContext';
import { api } from '../../../api/client';

export const useSupportData = () => {
    const { setRequests, setLoading, setPublicToken, setNewTokenValue } = useSupport();

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get('/support-requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Erro ao buscar solicitações:", err);
        } finally {
            setLoading(false);
        }
    }, [setRequests, setLoading]);

    const fetchPublicToken = useCallback(async () => {
        try {
            const res = await api.get('/settings/public-tokens');
            if (res.ok) {
                const data = await res.json();
                const token = data.PUBLIC_ACCESS_TOKEN_SUPPORT || '';
                setPublicToken(token);
                setNewTokenValue(token);
            }
        } catch (e) {
            console.error("Erro ao buscar token público", e);
        }
    }, [setPublicToken, setNewTokenValue]);

    useEffect(() => {
        fetchRequests();
        fetchPublicToken();
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, [fetchRequests, fetchPublicToken]);

    return { fetchRequests, fetchPublicToken };
};
