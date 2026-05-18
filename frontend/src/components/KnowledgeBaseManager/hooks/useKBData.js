import { useMemo } from 'react';
import { useKB } from '../KBContext';

export const useKBData = () => {
    const { knowledgeBase, kbFilterTerm, typeFilter, currentPage, itemsPerPage } = useKB();

    const filteredItems = useMemo(() => {
        const safeKb = Array.isArray(knowledgeBase) ? knowledgeBase : [];
        return safeKb
            .map((item, index) => (item ? { ...item, originalIndex: index } : null))
            .filter(item => !!item)
            .filter(item => {
                // Filtro por tipo (QA vs Chunks)
                if (typeFilter === 'chunks' && item.category !== 'Transcrição') return false;
                if (typeFilter === 'qa' && item.category === 'Transcrição') return false;

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

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    const paginatedItems = useMemo(() => {
        return filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredItems, currentPage]);

    return {
        filteredItems,
        paginatedItems,
        totalPages,
        hasItems: filteredItems.length > 0,
        totalCount: filteredItems.length
    };
};
