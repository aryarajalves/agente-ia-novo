import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';

const Backups = () => {
    const [config, setConfig] = useState({
        enabled: false,
        frequency_type: 'hours',
        interval_value: 6,
        retention_count: 30,
        backup_folder: 'Backup_AgenteFlow',
        last_run: null,
        next_run: null,
        last_success_filename: null,
        last_success_created_at: null
    });
    const [history, setHistory] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [runningBackup, setRunningBackup] = useState(false);
    const [uploadingBackup, setUploadingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState(false);
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Modais de Confirmação
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, filename: '' });
    const [confirmRestore, setConfirmRestore] = useState({ isOpen: false, id: null, filename: '' });

    // Seleção em lote
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmDeleteBatch, setConfirmDeleteBatch] = useState({ isOpen: false, ids: [] });
    const [deletingBatch, setDeletingBatch] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchHistory();
    }, []);

    useEffect(() => {
        const hasRunning = history.some(item => item.status === 'running');
        if (hasRunning) {
            const interval = setInterval(() => {
                fetchHistory();
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [history]);

    const isAnyBackupRunning = history.some(item => item.status === 'running');

    const fetchConfig = async () => {
        try {
            setLoadingConfig(true);
            const response = await api.get('/backups/config');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            }
        } catch (error) {
            console.error("Erro ao buscar configurações de backup:", error);
            showToast("Erro ao buscar configurações de backup.", "error");
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await api.get('/backups/history');
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
                setCurrentPage(1); // Reseta para a primeira página ao recarregar
            }
        } catch (error) {
            console.error("Erro ao buscar histórico de backups:", error);
            showToast("Erro ao buscar histórico de backups.", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            setSavingConfig(true);
            const response = await api.put('/backups/config', {
                enabled: config.enabled,
                frequency_type: config.frequency_type,
                interval_value: config.interval_value,
                retention_count: config.retention_count,
                backup_folder: config.backup_folder
            });
            if (response.ok) {
                showToast("Configurações salvas com sucesso!", "success");
                fetchConfig();
            } else {
                showToast("Erro ao salvar configurações.", "error");
            }
        } catch (error) {
            console.error("Erro ao salvar configurações de backup:", error);
            showToast("Erro de rede ao salvar configurações.", "error");
        } finally {
            setSavingConfig(false);
        }
    };

    const handleRunBackup = async () => {
        try {
            setRunningBackup(true);
            showToast("Iniciando backup em segundo plano...", "success");
            const response = await api.post('/backups/run');
            if (response.ok) {
                // Atualiza a lista imediatamente para mostrar o backup com status "running"
                fetchHistory();
            } else {
                showToast("Erro ao disparar backup.", "error");
            }
        } catch (error) {
            console.error("Erro ao rodar backup manual:", error);
            showToast("Erro de conexão ao rodar backup.", "error");
        } finally {
            setRunningBackup(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingBackup(true);
            showToast("Enviando arquivo de backup para o S3...", "success");

            const formData = new FormData();
            formData.append("file", file);

            const token = localStorage.getItem('admin_token');
            const apiKey = localStorage.getItem('agent_api_key') || '';
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (apiKey) headers['X-API-Key'] = apiKey;

            const response = await fetch(`${window.location.origin.replace('5300', '8002')}/api/backups/upload`, {
                method: 'POST',
                headers,
                body: formData
            });

            if (response.ok) {
                showToast("Backup enviado e registrado com sucesso!", "success");
                fetchHistory();
                fetchConfig();
            } else {
                const err = await response.json();
                showToast(err.detail || "Erro ao fazer upload do backup.", "error");
            }
        } catch (error) {
            console.error("Erro no upload de backup:", error);
            showToast("Erro de rede no upload de backup.", "error");
        } finally {
            setUploadingBackup(false);
            e.target.value = null; // reset input
        }
    };

    const handlePin = async (item) => {
        try {
            const response = await api.post(`/backups/history/${item.id}/pin`);
            if (response.ok) {
                setHistory(history.map(h => h.id === item.id ? { ...h, is_pinned: !h.is_pinned } : h));
                showToast(item.is_pinned ? "Backup liberado para auto-limpeza" : "Backup fixado! Não será apagado pela retenção.", "success");
            }
        } catch (error) {
            console.error("Erro ao fixar backup:", error);
        }
    };

    const handleDownload = async (item) => {
        try {
            const response = await api.get(`/backups/history/${item.id}/download`);
            if (response.ok) {
                const data = await response.json();
                window.open(data.url, '_blank');
            } else {
                showToast("Erro ao obter link de download.", "error");
            }
        } catch (error) {
            console.error("Erro ao baixar backup:", error);
        }
    };

    const handleDeleteClick = (item) => {
        setConfirmDelete({
            isOpen: true,
            id: item.id,
            filename: item.filename
        });
    };

    const handleConfirmDelete = async () => {
        try {
            const response = await api.delete(`/backups/history/${confirmDelete.id}`);
            if (response.ok) {
                showToast("Backup excluído permanentemente.", "success");
                setHistory(history.filter(h => h.id !== confirmDelete.id));
                setSelectedIds(prev => prev.filter(id => id !== confirmDelete.id));
            } else {
                showToast("Erro ao deletar backup.", "error");
            }
        } catch (error) {
            console.error("Erro ao deletar backup:", error);
        } finally {
            setConfirmDelete({ isOpen: false, id: null, filename: '' });
        }
    };



    const handleRestoreClick = (item) => {
        setConfirmRestore({
            isOpen: true,
            id: item.id,
            filename: item.filename
        });
    };

    const handleConfirmRestore = async () => {
        try {
            setRestoringBackup(true);
            showToast("Restaurando banco de dados a partir do backup selecionado. Aguarde...", "success");
            const response = await api.post(`/backups/history/${confirmRestore.id}/restore`);
            if (response.ok) {
                showToast("Banco de dados restaurado com sucesso! Recarregando sistema...", "success");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                const err = await response.json();
                showToast(err.detail || "Erro ao restaurar o banco de dados.", "error");
            }
        } catch (error) {
            console.error("Erro ao restaurar backup:", error);
            showToast("Erro de conexão ao restaurar banco.", "error");
        } finally {
            setRestoringBackup(false);
            setConfirmRestore({ isOpen: false, id: null, filename: '' });
        }
    };

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message, type }
        }));
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Nunca';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    };

    // Lógica da Paginação
    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Funções de Seleção e Deleção em Lote (Movidas para baixo da declaração de paginatedHistory)
    const handleSelectToggle = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const deletableHistoryItems = paginatedHistory.filter(item => !item.is_pinned && item.status !== 'running');
    const isAllSelected = deletableHistoryItems.length > 0 && deletableHistoryItems.every(item => selectedIds.includes(item.id));

    const handleSelectAllToggle = () => {
        const pageIds = deletableHistoryItems.map(item => item.id);
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
        }
    };

    const handleDeleteBatchClick = () => {
        if (selectedIds.length === 0) return;
        setConfirmDeleteBatch({ isOpen: true, ids: selectedIds });
    };

    const handleConfirmDeleteBatch = async () => {
        try {
            setDeletingBatch(true);
            const response = await api.post('/backups/delete-batch', { ids: confirmDeleteBatch.ids });
            if (response.ok) {
                showToast(`${confirmDeleteBatch.ids.length} backups excluídos com sucesso!`, "success");
                setSelectedIds([]);
                setConfirmDeleteBatch({ isOpen: false, ids: [] });
                fetchHistory();
            } else {
                const data = await response.json();
                showToast(data.detail || "Erro ao excluir backups em lote.", "error");
            }
        } catch (error) {
            console.error("Erro ao excluir backups em lote:", error);
            showToast("Erro de rede ao excluir backups em lote.", "error");
        } finally {
            setDeletingBatch(false);
        }
    };

    return (
        <div className="backups-page" style={{ padding: '1.5rem', color: '#fff' }}>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div className="title-group">
                    <h1>Gerenciamento de Backups</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Configure rotinas automáticas de backup completo do PostgreSQL e envie diretamente para o S3 da Backblaze.
                    </p>
                </div>
            </header>

            {/* Grid de Métricas no topo */}
            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontSize: '1.5rem' }}>
                        ✅
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Último Backup</span>
                        <h3 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0 0', wordBreak: 'break-all' }}>
                            {config.last_success_filename || 'Nenhum backup realizado'}
                        </h3>
                        {config.last_success_created_at && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {formatDateTime(config.last_success_created_at)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '12px', fontSize: '1.5rem' }}>
                        🕒
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo Backup</span>
                        <h3 style={{ fontSize: '1.1rem', margin: '0.2rem 0' }}>
                            {config.enabled ? formatDateTime(config.next_run) : 'Agendamento desativado'}
                        </h3>
                        {config.enabled && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                A cada {config.interval_value} {config.frequency_type === 'hours' ? 'hora(s)' : 'dia(s)'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '12px', fontSize: '1.5rem' }}>
                        🛡️
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retenção</span>
                        <h3 style={{ fontSize: '1.4rem', margin: '0.2rem 0', fontWeight: 'bold' }}>
                            {config.retention_count}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            backups mantidos no S3
                        </span>
                    </div>
                </div>
            </div>

            {/* Painel do Backup Manual */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>☁️</span> Backup Manual
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Clique para criar um backup imediato do banco de dados e enviar ao Backblaze S3.
                    </p>
                </div>
                <button
                    onClick={handleRunBackup}
                    disabled={runningBackup || isAnyBackupRunning}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        transition: 'opacity 0.2s'
                    }}
                >
                    {runningBackup || isAnyBackupRunning ? 'Processando...' : 'Fazer Backup Agora'}
                </button>
            </div>

            {/* Painel do Upload Externo */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📤</span> Importar Backup Externo
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Envie um arquivo de backup (.dump ou .dump.gz) de outro servidor para salvá-lo no S3 e restaurar quando desejar.
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="external-backup-file"
                        style={{
                            background: '#d97706',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {uploadingBackup ? 'Fazendo Upload...' : 'Fazer Upload de Backup'}
                    </label>
                    <input
                        type="file"
                        id="external-backup-file"
                        accept=".dump,.gz,.sql"
                        onChange={handleFileUpload}
                        disabled={uploadingBackup}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {/* Configurações de Agendamento */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <span>📅</span> Agendamento Automático
                </h3>

                <form onSubmit={handleSaveConfig}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', marginRight: '1rem' }}>
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span className="slider round" style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: config.enabled ? '#6366f1' : '#475569',
                                transition: '.4s', borderRadius: '34px'
                            }}>
                                <span style={{
                                    position: 'absolute', content: '""', height: '18px', width: '18px', left: config.enabled ? '28px' : '4px', bottom: '4px',
                                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                        <div>
                            <strong style={{ display: 'block', fontSize: '0.9rem' }}>Agendamento Ativado</strong>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Backups serão realizados automaticamente.</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Frequência
                            </label>
                            <select
                                value={config.frequency_type}
                                onChange={(e) => setConfig({ ...config, frequency_type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            >
                                <option value="hours">A cada X horas</option>
                                <option value="days">A cada X dias</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Valor do Intervalo
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={config.interval_value}
                                onChange={(e) => setConfig({ ...config, interval_value: parseInt(e.target.value) || 1 })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                                Backup a cada {config.interval_value} {config.frequency_type === 'hours' ? 'hora(s)' : 'dia(s)'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Pasta do Backup no S3
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: backups/ ou backups/cliente1"
                                value={config.backup_folder || ''}
                                onChange={(e) => setConfig({ ...config, backup_folder: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                                Subpasta onde os backups serão salvos no bucket do Backblaze S3. Ex: backups/ ou backups/cliente1
                            </span>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Retenção — Máximo de Backups no S3
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                    type="number"
                                    min="1"
                                    value={config.retention_count}
                                    onChange={(e) => setConfig({ ...config, retention_count: parseInt(e.target.value) || 30 })}
                                    style={{
                                        width: '80px',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                    backups — auto-deleção dos antigos.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            disabled={savingConfig}
                            style={{
                                background: '#8b5cf6',
                                color: 'white',
                                padding: '0.75rem 1.75rem',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            ⚙️ {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de Backups */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🗄️</span> Backups no S3 ({history.length})
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Seletor de itens por página */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mostrar:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <button
                            onClick={fetchHistory}
                            title="Atualizar lista"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#fff',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.1rem',
                                transition: 'background 0.2s'
                            }}
                        >
                            🔄
                        </button>
                    </div>
                </header>

                {/* Barra de Ações em Lote */}
                {history.length > 0 && !loadingHistory && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.4)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAllToggle}
                                disabled={deletableHistoryItems.length === 0}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: deletableHistoryItems.length === 0 ? 'not-allowed' : 'pointer',
                                    accentColor: '#8b5cf6'
                                }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                Selecionar Todos (não fixados nesta página)
                            </span>
                        </div>
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleDeleteBatchClick}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    padding: '0.4rem 1.25rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    transition: 'background 0.2s'
                                }}
                            >
                                🗑️ Excluir Selecionados ({selectedIds.length})
                            </button>
                        )}
                    </div>
                )}

                <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loadingHistory ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Carregando histórico...</div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum backup encontrado no S3.</div>
                    ) : (
                        paginatedHistory.map((item) => (
                            <div
                                key={item.id}
                                className="history-item"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: item.status === 'failure' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                    border: `1px solid ${item.status === 'failure' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Checkbox de Seleção */}
                                    {!item.is_pinned && item.status !== 'running' ? (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => handleSelectToggle(item.id)}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                cursor: 'pointer',
                                                marginRight: '0.5rem',
                                                accentColor: '#8b5cf6'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '18px', marginRight: '0.5rem' }} />
                                    )}

                                    {/* Indicador de Status / Fixar */}
                                    <button
                                        onClick={() => handlePin(item)}
                                        title={item.is_pinned ? "Liberar para auto-limpeza" : "Fixar backup"}
                                        style={{
                                            background: item.is_pinned ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.02)',
                                            border: item.is_pinned ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                            color: item.is_pinned ? '#f59e0b' : '#64748b',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        📌
                                    </button>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong style={{ fontSize: '0.9rem', color: item.status === 'failure' ? '#f87171' : '#fff' }}>
                                                {item.filename}
                                            </strong>
                                            {item.is_pinned && (
                                                <span style={{ background: '#d97706', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                    FIXADO
                                                </span>
                                            )}
                                            {item.status === 'running' && (
                                                <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                                    EM ANDAMENTO
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {formatDateTime(item.created_at)} • {formatBytes(item.file_size_bytes)}
                                        </span>
                                        {item.status === 'failure' && (
                                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                Erro: {item.error_message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {item.status === 'success' && (
                                        <>
                                            <button
                                                onClick={() => handleRestoreClick(item)}
                                                title="Restaurar este Backup (Substituir Banco)"
                                                style={{
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    color: '#818cf8',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem'
                                                }}
                                            >
                                                🔄
                                            </button>
                                            <button
                                                onClick={() => handleDownload(item)}
                                                title="Download Backup"
                                                style={{
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    color: '#10b981',
                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                📥
                                            </button>
                                        </>
                                    )}

                                    {!item.is_pinned && (
                                        <button
                                            onClick={() => handleDeleteClick(item)}
                                            title="Excluir Backup"
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Controles de Paginação */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#fff',
                                padding: '0.4rem 1rem',
                                borderRadius: '6px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1,
                                fontSize: '0.85rem'
                            }}
                        >
                            Anterior
                        </button>
                        
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#fff',
                                padding: '0.4rem 1rem',
                                borderRadius: '6px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.5 : 1,
                                fontSize: '0.85rem'
                            }}
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onCancel={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Excluir Backup"
                message={`Tem certeza que deseja excluir permanentemente o backup "${confirmDelete.filename}" do S3 e do banco de dados? Esta ação é irreversível.`}
                confirmText="Excluir permanentemente"
                cancelText="Cancelar"
                type="danger"
            />

            <ConfirmModal
                isOpen={confirmRestore.isOpen}
                onCancel={() => setConfirmRestore({ ...confirmRestore, isOpen: false })}
                onConfirm={handleConfirmRestore}
                title="Restaurar Banco de Dados"
                message={`⚠️ AVISO CRÍTICO: Tem certeza de que deseja restaurar o banco de dados para a versão do backup "${confirmRestore.filename}"? Todos os dados atuais do sistema serão substituídos e o painel será reiniciado.`}
                confirmText={restoringBackup ? "Restaurando..." : "Sim, Restaurar Agora"}
                cancelText="Cancelar"
                type="danger"
            />

            <ConfirmModal
                isOpen={confirmDeleteBatch.isOpen}
                onCancel={() => setConfirmDeleteBatch({ isOpen: false, ids: [] })}
                onConfirm={handleConfirmDeleteBatch}
                title="Excluir Backups em Lote"
                message={`Tem certeza que deseja excluir permanentemente os ${confirmDeleteBatch.ids.length} backups selecionados do S3 e do banco de dados? Esta ação é irreversível.`}
                confirmText={deletingBatch ? "Excluindo..." : "Excluir permanentemente"}
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Backups;
