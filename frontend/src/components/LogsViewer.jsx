import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';

const LEVELS = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

const LEVEL_COLORS = {
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.25)', color: '#fecaca' },
    ERROR: { bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
    WARNING: { bg: 'rgba(217, 119, 6, 0.18)', color: '#fbbf24' },
    INFO: { bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
    DEBUG: { bg: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8' },
};

const TAIL_OPTIONS = [500, 1000, 2000, 5000];
const PAGE_SIZE_OPTIONS = [1000, 2500, 5000, 10000];

const LogsViewer = () => {
    const [containers, setContainers] = useState([]);
    const [selectedContainers, setSelectedContainers] = useState([]);
    const [tail, setTail] = useState(2000);

    // Seletor de dia (dropdown com os dias que realmente possuem log)
    const [availableDays, setAvailableDays] = useState([]);
    const [totalLogCount, setTotalLogCount] = useState(0);
    const [selectedDay, setSelectedDay] = useState(null); // null = "Últimas N linhas"
    const [dayPickerOpen, setDayPickerOpen] = useState(false);
    const dayPickerRef = useRef(null);

    const [timeFrom, setTimeFrom] = useState('');
    const [timeTo, setTimeTo] = useState('');
    const [search, setSearch] = useState('');
    const [searchTerms, setSearchTerms] = useState([]);
    const [activeLevels, setActiveLevels] = useState([]);
    const [activeTags, setActiveTags] = useState([]);
    const [quickFilters, setQuickFilters] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDays, setLoadingDays] = useState(false);
    const [errors, setErrors] = useState([]);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [pageSize, setPageSize] = useState(1000);
    const [currentPage, setCurrentPage] = useState(1);

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    };

    const fetchContainers = useCallback(async () => {
        try {
            const response = await api.get('/logs/containers');
            if (response.ok) {
                const data = await response.json();
                setContainers(data);
            }
        } catch (error) {
            console.error('Erro ao listar containers:', error);
        }
    }, []);

    const fetchAvailableDays = useCallback(async () => {
        setLoadingDays(true);
        try {
            const response = await api.get('/logs/days');
            if (response.ok) {
                const data = await response.json();
                setAvailableDays(data.days || []);
                setTotalLogCount(data.total_count || 0);
            }
        } catch (error) {
            console.error('Erro ao buscar dias disponíveis:', error);
        } finally {
            setLoadingDays(false);
        }
    }, []);

    useEffect(() => {
        fetchContainers();
        fetchAvailableDays();
    }, [fetchContainers, fetchAvailableDays]);

    // Fecha o dropdown de dias ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dayPickerRef.current && !dayPickerRef.current.contains(e.target)) {
                setDayPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleLevel = (lvl) => {
        setActiveLevels((prev) => prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]);
    };

    const toggleTag = (tagKey) => {
        setActiveTags((prev) => prev.includes(tagKey) ? prev.filter((t) => t !== tagKey) : [...prev, tagKey]);
    };

    const toggleContainer = (name) => {
        setSelectedContainers((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);
    };

    const handleLoadLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedContainers.length > 0) params.set('containers', selectedContainers.join(','));
            params.set('tail', String(tail));
            if (selectedDay) params.set('day', selectedDay);
            if (selectedDay && timeFrom) params.set('time_from', timeFrom);
            if (selectedDay && timeTo) params.set('time_to', timeTo);
            if (activeLevels.length > 0) params.set('level', activeLevels.join(','));
            if (activeTags.length > 0) params.set('tag', activeTags.join(','));
            if (search.trim()) params.set('search', search.trim());

            const response = await api.get(`/logs?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
                setQuickFilters(data.quick_filters || []);
                setErrors(data.errors || []);
                if ((data.errors || []).length > 0) {
                    showToast(`Alguns containers não puderam ser lidos (${data.errors.length}).`, 'error');
                }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Erro ao carregar logs.', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            showToast('Erro de conexão ao carregar logs.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Recarrega automaticamente quando o usuário muda containers, dia ou horário —
    // sem isso, o clique no chip/checkbox parecia "não fazer nada" até apertar Carregar.
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            handleLoadLogs();
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedContainers, selectedDay, timeFrom, timeTo]);

    const handlePasteManually = () => {
        const lines = pastedText.split('\n').filter((l) => l.trim());
        const re = /^(\d{2,4}[-/]\d{2}[-/]\d{2,4}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s*-\s*([\w.\-/]+)\s*-\s*(CRITICAL|ERROR|WARNING|WARN|INFO|DEBUG)\s*-\s*(.*)$/;
        const parsed = lines.map((line, idx) => {
            const match = line.trim().match(re);
            if (match) {
                let level = match[3].toUpperCase();
                if (level === 'WARN') level = 'WARNING';
                return {
                    id: `pasted-${idx}`,
                    container: 'colado-manualmente',
                    timestamp_display: match[1],
                    logger: match[2],
                    level,
                    message: match[4],
                    raw: line,
                    tags: [],
                };
            }
            return {
                id: `pasted-${idx}`,
                container: 'colado-manualmente',
                timestamp_display: '--',
                logger: 'colado-manualmente',
                level: 'INFO',
                message: line,
                raw: line,
                tags: [],
            };
        });
        setLogs(parsed);
        setErrors([]);
        setShowPasteModal(false);
        setPastedText('');
        showToast(`${parsed.length} linha(s) coladas e analisadas.`, 'success');
    };

    const handleClearView = () => {
        setLogs([]);
        setErrors([]);
    };

    const handleCopy = () => {
        const text = filteredLogs.map((l) => l.raw).join('\n');
        navigator.clipboard.writeText(text);
        showToast(`${filteredLogs.length.toLocaleString('pt-BR')} linha(s) copiada(s) para a área de transferência.`, 'success');
    };

    // Handlers para download e cópia dos logs

    const handleDownload = () => {
        const text = filteredLogs.map((l) => l.raw).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSelectDay = (dateKey) => {
        setSelectedDay(dateKey);
        setDayPickerOpen(false);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        const term = search.trim().toLowerCase();
        if (!term) return;
        setSearchTerms((prev) => prev.includes(term) ? prev : [...prev, term]);
        setSearch('');
    };

    const removeSearchTerm = (term) => {
        setSearchTerms((prev) => prev.filter((t) => t !== term));
    };

    // Filtro local adicional (nível/tag/busca já aplicados no backend, mas mantemos client-side para o "colar manualmente").
    // Cada badge em searchTerms precisa estar presente (AND) — além do texto ainda sendo digitado (live, sem apertar Enter).
    const filteredLogs = useMemo(() => {
        const liveTerm = search.trim().toLowerCase();
        const allTerms = liveTerm ? [...searchTerms, liveTerm] : searchTerms;
        return logs.filter((l) => {
            if (activeLevels.length > 0 && !activeLevels.includes(l.level)) return false;
            const haystack = `${l.message} ${l.logger}`.toLowerCase();
            if (allTerms.length > 0 && !allTerms.every((term) => haystack.includes(term))) return false;
            return true;
        });
    }, [logs, activeLevels, search, searchTerms]);

    // Derivado de 'logs' (não de um estado separado) para que exclusões de linhas
    // atualizem os contadores imediatamente, em vez de ficarem com o valor antigo do servidor.
    const levelCounts = useMemo(() => {
        const counts = LEVELS.reduce((acc, lv) => ({ ...acc, [lv]: 0 }), {});
        logs.forEach((l) => {
            if (counts[l.level] !== undefined) counts[l.level] += 1;
        });
        return counts;
    }, [logs]);

    // Paginação da visualização — reseta para a página 1 sempre que os logs ou filtros mudam,
    // senão o usuário pode ficar "preso" numa página vazia após uma nova busca/filtro.
    useEffect(() => {
        setCurrentPage(1);
    }, [logs, activeLevels, searchTerms, search, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pagedLogs = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, safePage, pageSize]);

    const selectedDayInfo = availableDays.find((d) => d.date === selectedDay);
    const dayButtonLabel = selectedDayInfo ? selectedDayInfo.date_display : 'Selecionar dia';
    const loadButtonLabel = selectedDayInfo ? `Carregar ${selectedDayInfo.date_display}` : 'Carregar Logs';

    const inputStyle = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        outline: 'none',
        fontSize: '0.85rem',
    };

    const chipStyle = (active, colorSet) => ({
        padding: '0.4rem 0.9rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
        border: `1px solid ${active ? (colorSet ? colorSet.color : '#8b5cf6') : 'rgba(255,255,255,0.1)'}`,
        background: active ? (colorSet ? colorSet.bg : 'rgba(139, 92, 246, 0.25)') : 'rgba(255,255,255,0.03)',
        color: active ? (colorSet ? colorSet.color : '#c4b5fd') : '#94a3b8',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
    });

    return (
        <div className="logs-viewer-page" style={{ padding: '1.5rem', color: '#fff' }}>
            <header style={{ marginBottom: '1.5rem' }}>
                <h1>Visualizador de Logs</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Console em tempo real de todos os containers do sistema (backend, worker, beat, frontend, banco, redis, storage e túnel).
                </p>
            </header>

            {/* Barra de ações principais */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center',
                background: 'rgba(30, 41, 59, 0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem'
            }}>
                {/* Dropdown de dia com log real */}
                <div style={{ position: 'relative' }} ref={dayPickerRef}>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Dia</label>
                    <button
                        onClick={() => setDayPickerOpen((v) => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)',
                            color: '#c4b5fd', padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: 700,
                            cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        📅 {dayButtonLabel} <span style={{ fontSize: '0.7rem' }}>▾</span>
                    </button>

                    {dayPickerOpen && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem',
                            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: '220px', zIndex: 20,
                            maxHeight: '320px', overflowY: 'auto'
                        }}>
                            <div
                                onClick={() => handleSelectDay(null)}
                                style={{
                                    padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                                    color: !selectedDay ? '#c4b5fd' : '#e2e8f0', fontWeight: !selectedDay ? 700 : 500,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }}
                            >
                                Últimas N linhas
                            </div>
                            {loadingDays ? (
                                <div style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>Verificando dias com log...</div>
                            ) : availableDays.length === 0 ? (
                                <div style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>Nenhum dia com log encontrado nos últimos 30 dias.</div>
                            ) : (
                                availableDays.map((d) => (
                                    <div
                                        key={d.date}
                                        onClick={() => handleSelectDay(d.date)}
                                        style={{
                                            padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                                            display: 'flex', justifyContent: 'space-between', gap: '0.75rem',
                                            color: selectedDay === d.date ? '#c4b5fd' : '#e2e8f0',
                                            fontWeight: selectedDay === d.date ? 700 : 500,
                                        }}
                                    >
                                        <span>{d.date_display}</span>
                                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.count.toLocaleString('pt-BR')}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {!selectedDay && (
                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Linhas por container</label>
                        <select value={tail} onChange={(e) => setTail(parseInt(e.target.value))} style={{ ...inputStyle, width: 'auto' }}>
                            {TAIL_OPTIONS.map((n) => <option key={n} value={n} style={{ background: '#0f172a' }}>{n.toLocaleString('pt-BR')}</option>)}
                        </select>
                    </div>
                )}

                <button
                    onClick={handleLoadLogs}
                    disabled={loading}
                    style={{
                        background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.25rem',
                        borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        marginTop: '1.1rem'
                    }}
                >
                    🔄 {loading ? 'Carregando...' : loadButtonLabel}
                </button>

                <span style={{ color: 'rgba(255,255,255,0.1)', marginTop: '1.1rem' }}>|</span>

                <button
                    onClick={() => setShowPasteModal(true)}
                    style={{
                        background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '1.1rem'
                    }}
                >
                    📋 Colar manualmente
                </button>

                <button
                    onClick={handleClearView}
                    title="Limpa apenas a visualização atual (não apaga os logs reais dos containers)"
                    style={{
                        background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '1.1rem'
                    }}
                >
                    🗑️ Limpar
                </button>

                <button
                    disabled
                    title="Excluir os logs de verdade exigiria acesso de escrita aos arquivos de log do Docker no host — não habilitado por segurança nesta versão."
                    style={{
                        background: 'transparent', color: '#f87171', border: 'none',
                        padding: '0.6rem 0.5rem', fontWeight: 600, cursor: 'not-allowed', marginTop: '1.1rem',
                        opacity: 0.5, fontSize: '0.85rem'
                    }}
                >
                    🗑️ Apagar log no servidor
                </button>

                <div
                    style={{ marginLeft: 'auto', marginTop: '1.1rem', fontSize: '0.8rem', color: '#94a3b8' }}
                    title="Total real nos containers nos últimos 30 dias — não muda quando você exclui linhas apenas da visualização abaixo."
                >
                    {totalLogCount.toLocaleString('pt-BR')} linhas nos containers (30 dias)
                </div>
            </div>

            {/* Seletor de containers */}
            {containers.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        Containers ({selectedContainers.length === 0 ? 'todos' : selectedContainers.length} selecionado{selectedContainers.length === 1 ? '' : 's'})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {containers.map((c) => (
                            <span
                                key={c.name}
                                onClick={() => toggleContainer(c.name)}
                                style={chipStyle(selectedContainers.includes(c.name))}
                                title={`${c.image} — ${c.status}`}
                            >
                                {c.status === 'running' ? '🟢' : '⚪'} {c.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtros rápidos por tag */}
            {quickFilters.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Filtros Rápidos</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {quickFilters.map((f) => (
                            <span key={f.key} onClick={() => toggleTag(f.key)} style={chipStyle(activeTags.includes(f.key))}>
                                {f.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Horário + busca */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Horário De</label>
                    <input type="time" step="1" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} style={inputStyle} disabled={!selectedDay} title={!selectedDay ? 'Selecione um dia específico para filtrar por horário' : ''} />
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Horário Até</label>
                    <input type="time" step="1" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} style={inputStyle} disabled={!selectedDay} title={!selectedDay ? 'Selecione um dia específico para filtrar por horário' : ''} />
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Busca no texto</label>
                    <input type="text" placeholder="Buscar e pressionar Enter para fixar..." value={search} onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown} style={inputStyle} />
                </div>
            </div>

            {/* Badges dos termos de busca fixados (Enter) — todos precisam aparecer na linha (filtro E) */}
            {searchTerms.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', marginTop: '-0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Contém:</span>
                    {searchTerms.map((term) => (
                        <span key={term} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                            background: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd'
                        }}>
                            {term}
                            <span onClick={() => removeSearchTerm(term)} style={{ cursor: 'pointer', opacity: 0.8, fontWeight: 700 }}>✕</span>
                        </span>
                    ))}
                    <span
                        onClick={() => setSearchTerms([])}
                        style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.25rem' }}
                    >
                        limpar todos
                    </span>
                </div>
            )}

            {/* Níveis */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Nível:</span>
                {LEVELS.map((lvl) => (
                    <span key={lvl} onClick={() => toggleLevel(lvl)} style={chipStyle(activeLevels.includes(lvl), LEVEL_COLORS[lvl])}>
                        {lvl} {levelCounts[lvl] !== undefined ? `(${levelCounts[lvl]})` : ''}
                    </span>
                ))}
            </div>

            {errors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171' }}>
                    Não foi possível ler os logs de: {errors.map((e) => e.container).join(', ')}
                </div>
            )}

            {/* Lista de logs */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '0.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{filteredLogs.length.toLocaleString('pt-BR')} linhas</strong>
                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            Mostrar
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(parseInt(e.target.value))}
                                style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n} style={{ background: '#0f172a' }}>{n.toLocaleString('pt-BR')}</option>
                                ))}
                            </select>
                            linhas por vez
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        
                        <button onClick={handleLoadLogs} disabled={loading} title="Buscar logs mais recentes com os filtros atuais" style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🔄 Atualizar</button>
                        <button onClick={handleCopy} disabled={filteredLogs.length === 0} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>📋 Copiar</button>
                        <button onClick={handleDownload} disabled={filteredLogs.length === 0} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>⬇️ Download</button>
                    </div>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.78rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            Nenhum log carregado. Escolha um dia ou clique em "Carregar Logs" para buscar o console dos containers.
                        </div>
                    ) : (
                        pagedLogs.map((entry, idx) => {
                            const colorSet = LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO;
                            return (
                                <div key={entry.id} style={{
                                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                    padding: '0.4rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    background: 'transparent'
                                }}>
                                    <span style={{ color: '#475569', flexShrink: 0, marginTop: '2px', minWidth: '3em', textAlign: 'right', userSelect: 'none' }}>
                                        {(safePage - 1) * pageSize + idx + 1}
                                    </span>
                                    <span style={{
                                        background: colorSet.bg, color: colorSet.color, padding: '1px 8px',
                                        borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem', flexShrink: 0, marginTop: '2px'
                                    }}>
                                        {entry.level}
                                    </span>
                                    <span style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }}>
                                        {entry.timestamp_display || '--'}
                                    </span>
                                    <span style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }}>
                                        [{entry.container}]
                                    </span>
                                    <span style={{ color: '#e2e8f0', wordBreak: 'break-word', flex: 1 }}>
                                        <span style={{ color: '#7dd3fc' }}>{entry.logger}</span> — {entry.message}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {filteredLogs.length > 0 && totalPages > 1 && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem',
                        padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem',
                                cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1
                            }}
                        >
                            ← Anterior
                        </button>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Página {safePage.toLocaleString('pt-BR')} de {totalPages.toLocaleString('pt-BR')}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem',
                                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1
                            }}
                        >
                            Próxima →
                        </button>
                    </div>
                )}
            </div>

            {showPasteModal && (
                <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%' }}>
                        <span className="modal-icon">📋</span>
                        <h2 className="modal-title">Colar Logs Manualmente</h2>
                        <p className="modal-message">Cole abaixo linhas de log copiadas de qualquer lugar (ex: Portainer). Elas serão analisadas localmente, sem chamar o servidor.</p>
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="2026-07-01 16:18:30 - services.scheduler - INFO - mensagem..."
                            rows={10}
                            style={{ ...inputStyle, marginTop: '1rem', fontFamily: 'monospace', resize: 'vertical' }}
                        />
                        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                            <button className="modal-btn modal-btn-cancel" onClick={() => setShowPasteModal(false)}>Cancelar</button>
                            <button className="modal-btn modal-btn-confirm" onClick={handlePasteManually} disabled={!pastedText.trim()}>Analisar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LogsViewer;
