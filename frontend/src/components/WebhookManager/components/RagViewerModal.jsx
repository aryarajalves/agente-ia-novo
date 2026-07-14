import React from 'react';

// Extrai o cabeçalho (texto livre antes do primeiro "--- Item ---") e a lista
// estruturada de itens retornados pela busca vetorial (RAG), a partir do texto
// bruto gerado em agent_core/core.py e webhook_tasks.py no formato:
//   --- Item 1 (Relevância: 77.1%) ---
//   Perg: ...
//   Resp: ...
const parseRagData = (raw) => {
    if (!raw) return { header: '', items: [] };

    const itemRegex = /---\s*Item\s*(\d+)\s*\(Relevância:\s*([^)]+)\)\s*---\s*\nPerg:\s*([\s\S]*?)\nResp:\s*([\s\S]*?)(?=(?:\n?---\s*Item\s*\d+)|$)/g;
    const items = [];
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        items.push({
            idx: match[1],
            relevance: (match[2] || '').trim(),
            question: (match[3] || '').trim(),
            answer: (match[4] || '').trim(),
        });
    }

    const firstItemIdx = raw.search(/---\s*Item\s*\d+/);
    const header = (firstItemIdx !== -1 ? raw.slice(0, firstItemIdx) : raw).trim();

    return { header, items };
};

const relevanceTier = (relevanceStr) => {
    const num = parseFloat((relevanceStr || '').replace('%', '').replace(',', '.'));
    if (isNaN(num)) return { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.25)', pct: 0 };
    if (num >= 75) return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', pct: num };
    if (num >= 50) return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', pct: num };
    return { color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', pct: num };
};

export const RagViewerModal = ({ data, onClose }) => {
    if (!data) return null;
    const { header, items } = parseRagData(data);

    return (
        <div
            className="fade-in"
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem', transition: 'all 0.3s'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '24px',
                    width: '100%', maxWidth: '850px',
                    height: '85vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 40px rgba(99, 102, 241, 0.1)',
                    overflow: 'hidden', position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>📚</div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Consulta à Base de Conhecimento (RAG)</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''} relevante${items.length > 1 ? 's' : ''} encontrado${items.length > 1 ? 's' : ''}` : 'Detalhes da busca vetorial'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', color: '#cbd5e1' }} className="custom-scrollbar">
                    {header && (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: items.length > 0 ? '1.5rem' : 0, lineHeight: 1.6 }}>
                            {header}
                        </div>
                    )}

                    {items.length === 0 ? (
                        !header && (
                            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: '#64748b' }}>
                                Nenhum detalhe disponível para esta etapa.
                            </div>
                        )
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {items.map((item) => {
                                const tier = relevanceTier(item.relevance);
                                return (
                                    <div
                                        key={item.idx}
                                        style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${tier.border}`,
                                            borderRadius: '16px',
                                            padding: '1.25rem',
                                            display: 'flex', flexDirection: 'column', gap: '0.85rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Item {item.idx}
                                            </span>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                                                padding: '3px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800
                                            }}>
                                                🎯 Relevância: {item.relevance}
                                            </span>
                                        </div>

                                        {/* Barra de relevância */}
                                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.max(2, Math.min(100, tier.pct))}%`, height: '100%',
                                                background: tier.color, borderRadius: '3px', transition: 'width 0.3s ease'
                                            }} />
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#818cf8', marginBottom: '4px' }}>
                                                💬 Pergunta da Base
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#fff', lineHeight: 1.5, fontWeight: 600 }}>
                                                {item.question || '-'}
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>
                                                ✍️ Resposta Integrada ao Contexto
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {item.answer || '-'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RagViewerModal;
