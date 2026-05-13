import React from 'react';

const HistoryFilters = ({ filters, onFilterChange, onApply, onClear }) => {
    return (
        <div style={{
            padding: '1rem 1.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexWrap: 'nowrap',
            gap: '0.75rem',
            alignItems: 'flex-end',
            overflowX: 'auto',
            flexShrink: 0,
        }}>
            <div style={{ flex: 1.5, minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>Busca</label>
                <input 
                    type="text" 
                    value={filters.search} 
                    onChange={e => onFilterChange({ search: e.target.value })}
                    placeholder="Nome ou telefone..."
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '0.5rem 0.8rem', color: '#fff', fontSize: '0.82rem' }}
                />
            </div>
            <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Status Contato</label>
                <select 
                    value={filters.pode_enviar} 
                    onChange={e => onFilterChange({ pode_enviar: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '0.5rem 0.6rem', color: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                    <option value="all">Todos</option>
                    <option value="true">Ativos</option>
                    <option value="false">Bloqueados</option>
                </select>
            </div>
            <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Janela 24h</label>
                <select 
                    value={filters.janela_24h} 
                    onChange={e => onFilterChange({ janela_24h: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '0.5rem 0.6rem', color: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                    <option value="all">Todos</option>
                    <option value="true">Aberta</option>
                    <option value="false">Fechada</option>
                </select>
            </div>
            <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Dono</label>
                <select 
                    value={filters.dono} 
                    onChange={e => onFilterChange({ dono: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '0.5rem 0.6rem', color: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                    <option value="all">Todos</option>
                    <option value="usuario">Usuário</option>
                    <option value="agente">Agente</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <div style={{ width: '125px' }}>
                    <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Início</label>
                    <input type="date" value={filters.start_date} onChange={e => onFilterChange({ start_date: e.target.value })} style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.45rem 0.5rem', color: '#fff', fontSize: '0.78rem' }} />
                </div>
                <div style={{ width: '125px' }}>
                    <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Fim</label>
                    <input type="date" value={filters.end_date} onChange={e => onFilterChange({ end_date: e.target.value })} style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.45rem 0.5rem', color: '#fff', fontSize: '0.78rem' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onApply}
                    style={{ background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '7px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                    <span style={{ fontSize: '1rem' }}>🔍</span> Filtrar
                </button>
                <button
                    onClick={onClear}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '7px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}
                    title="Limpar todos os filtros"
                >
                    🧹
                </button>
            </div>
        </div>
    );
};

export default HistoryFilters;
