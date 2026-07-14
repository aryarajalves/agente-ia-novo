import { useSupport } from '../SupportContext';
import { api } from '../../../api/client';

export const useSupportActions = () => {
    const { 
        setRequests, setSelectedIds, setConfirmResolve, setConfirmDelete,
        setPublicToken, setIsEditingToken
    } = useSupport();

    const resolveTicket = async (id) => {
        try {
            const res = await api.post(`/support-requests/${id}/resolve`);
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== id));
                setSelectedIds(prev => prev.filter(sid => sid !== id));
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    const batchResolveTickets = async (ids) => {
        try {
            const res = await api.post('/support-requests/bulk-resolve', { ids });
            if (res.ok) {
                setRequests(prev => prev.filter(r => !ids.includes(r.id)));
                setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    const deleteTickets = async (ids) => {
        try {
            let res;
            if (ids.length === 1) {
                res = await api.delete(`/support-requests/${ids[0]}`);
            } else {
                res = await api.post('/support-requests/bulk-delete', { ids });
            }
            if (res.ok) {
                setRequests(prev => prev.filter(r => !ids.includes(r.id)));
                setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    const saveToken = async (newTokenValue) => {
        try {
            const res = await api.put(`/global-variables/key/PUBLIC_ACCESS_TOKEN_SUPPORT`, { value: newTokenValue.trim() });
            if (res.ok) {
                setPublicToken(newTokenValue.trim());
                setIsEditingToken(false);
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };

    return {
        resolveTicket,
        batchResolveTickets,
        deleteTickets,
        saveToken
    };
};
