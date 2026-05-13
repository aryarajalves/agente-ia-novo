import { useMemo } from 'react';
import { useKB } from '../KBContext';

export const useKBData = () => {
    const { knowledgeBase, kbFilterTerm, currentPage } = useKB();
    const ITEMS_PER_PAGE = 100;

    const filteredItems = useMemo(() => {
        const safeKb = Array.isArray(knowledgeBase) ? knowledgeBase : [];
        return safeKb
            .map((item, index) => (item ? { ...item, originalIndex: index } : null))
            .filter(item => !!item)
            .filter(item => {
                if (!kbFilterTerm.trim()) return true;
                const t = kbFilterTerm.toLowerCase();
                return (
                    (item?.question || '').toLowerCase().includes(t) ||
                    (item?.answer || '').toLowerCase().includes(t) ||
                    (item?.category || '').toLowerCase().includes(t) ||
                    (item?.metadata_val || '').toLowerCase().includes(t)
                );
            });
    }, [knowledgeBase, kbFilterTerm]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    
    const paginatedItems = useMemo(() => {
        return filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    return {
        filteredItems,
        paginatedItems,
        totalPages,
        hasItems: filteredItems.length > 0,
        totalCount: filteredItems.length
    };
};
