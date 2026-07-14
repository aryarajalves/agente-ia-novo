import React, { useState, useEffect, useRef } from 'react';

const ZapJordsLabelMultiSelect = ({ selected = [], options = [], onChange, accentColor = '#6366f1', placeholder = 'Buscar etiqueta...' }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const safeSelected = Array.isArray(selected) ? selected : [];
    const safeOptions = options || [];

    const filtered = safeOptions.filter(o => o && o.toLowerCase().includes(search.toLowerCase()));
    const canAddCustom = search.trim() && !safeOptions.some(o => o.toLowerCase() === search.trim().toLowerCase());

    return (
        <div ref={ref} style={{ position: 'relative', marginTop: '0.5rem' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ background: '#0f172a', border: `1px solid ${open ? accentColor + '66' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', minHeight: '42px', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', transition: 'border 0.15s' }}
            >
                {safeSelected.length === 0 ? (
                    <span style={{ color: '#475569', fontSize: '0.82rem' }}>Nenhuma etiqueta selecionada</span>
                ) : (
                    safeSelected.map(lbl => (
                        <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: accentColor + '22', border: `1px solid ${accentColor}44`, borderRadius: '20px', padding: '2px 8px 2px 10px', fontSize: '0.75rem', color: accentColor, fontWeight: 600 }}>
                            {lbl}
                            <button type="button" onClick={e => { e.stopPropagation(); onChange(safeSelected.filter(x => x !== lbl)); }}
                                style={{ background: 'none', border: 'none', color: accentColor, cursor: 'pointer', fontSize: '0.8rem', padding: 0, marginLeft: '3px' }}>✕</button>
                        </span>
                    ))
                )}
                <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.75rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#0f172a', border: `1px solid ${accentColor}44`, borderRadius: '8px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem' }}>
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={placeholder}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.45rem 0.7rem', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                        />
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {filtered.length === 0 && !canAddCustom ? (
                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Nenhuma etiqueta encontrada</div>
                        ) : filtered.map(opt => {
                            const isSelected = safeSelected.includes(opt);
                            return (
                                <div
                                    key={opt}
                                    onClick={e => { e.stopPropagation(); onChange(isSelected ? safeSelected.filter(x => x !== opt) : [...safeSelected, opt]); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', cursor: 'pointer', background: isSelected ? accentColor + '18' : 'transparent', transition: 'background 0.1s' }}
                                >
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${isSelected ? accentColor : '#334155'}`, background: isSelected ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                                        {isSelected && <span style={{ color: '#0f172a', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: isSelected ? '#fff' : '#94a3b8' }}>{opt}</span>
                                </div>
                            );
                        })}
                        {canAddCustom && (
                            <div
                                onClick={e => {
                                    e.stopPropagation();
                                    const newLabel = search.trim();
                                    onChange([...safeSelected, newLabel]);
                                    setSearch('');
                                }}
                                style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', borderTop: '1px dashed rgba(255,255,255,0.08)', color: accentColor, fontSize: '0.82rem', fontWeight: 600 }}
                            >
                                ➕ Adicionar "{search.trim()}"
                            </div>
                        )}
                    </div>
                    {safeSelected.length > 0 && (
                        <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: accentColor }}>{safeSelected.length} selecionada(s)</span>
                            <button type="button" onClick={e => { e.stopPropagation(); onChange([]); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>Limpar todas</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ZapJordsLabelMultiSelect;
