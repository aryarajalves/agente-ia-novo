import { useCallback } from 'react';
import { useImporter } from '../ImporterContext';
import { api } from '../../../api/client';

export const useImporterLogic = () => {
    const {
        kbId, file, url, pastedText, smartConfig,
        setColumns, setPreviewItems, setStage, setLoading, setProgress, setError, setImportStats
    } = useImporter();

    const analyzeFile = useCallback(async (selectedFile) => {
        setLoading(true);
        setProgress(0);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await api.post('/knowledge-bases/analyze-file', formData);
            if (response.ok) {
                const data = await response.json();
                setColumns(data.columns || []);
                // Additional auto-mapping logic would go here
            }
        } catch (err) {
            setError("Falha ao analisar arquivo.");
        } finally {
            setLoading(false);
            setProgress(100);
        }
    }, [setColumns, setError, setLoading, setProgress]);

    const handleGeneratePreview = useCallback(async () => {
        setLoading(true);
        setProgress(0);
        setError(null);

        try {
            const formData = new FormData();
            if (url) formData.append('url', url);
            else if (pastedText) formData.append('text', pastedText);
            else formData.append('file', file);

            // Append smartConfig items...
            const response = await api.post(`/knowledge-bases/${kbId}/preview-smart-import`, formData);
            if (response.ok) {
                const data = await response.json();
                setPreviewItems(data.preview || []);
                setStage('preview');
            }
        } catch (err) {
            setError("Erro ao gerar prévia.");
        } finally {
            setLoading(false);
        }
    }, [kbId, file, url, pastedText, smartConfig, setPreviewItems, setStage, setLoading, setError, setProgress]);

    const handleSaveBatch = useCallback(async (selectedItems) => {
        setLoading(true);
        try {
            const response = await api.post(`/knowledge-bases/${kbId}/import-batch`, { items: selectedItems });
            if (response.ok) {
                const data = await response.json();
                setImportStats({ added: selectedItems.length, updated: 0 });
                setStage('success');
            }
        } catch (err) {
            setError("Erro ao salvar.");
        } finally {
            setLoading(false);
        }
    }, [kbId, setImportStats, setStage, setLoading, setError]);

    return {
        analyzeFile,
        handleGeneratePreview,
        handleSaveBatch
    };
};
