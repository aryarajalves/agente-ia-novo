import React from 'react';

// Formata bytes em KB/MB legível. Retorna null se o tamanho ainda não foi registrado
// (ex: depoimentos cadastrados antes da migração, até o backfill rodar).
function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return null;
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) {
        const kb = bytes / 1024;
        return `${kb.toFixed(0)} KB`;
    }
    return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

function TestimonialCard({ item, categories, onEdit, onDelete, onMediaError, onMove, isFirst, isLast }) {
    const fileSizeLabel = formatFileSize(item.file_size_bytes);
    return (
        <div style={{
            background: 'rgba(20, 18, 30, 0.45)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
            <div style={{
                width: '100%', height: '200px', background: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden'
            }}>
                {item.media_type === 'image' ? (
                    <img
                        src={item.url}
                        alt={item.filename}
                        onError={onMediaError}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <video
                        src={item.url}
                        controls
                        onError={onMediaError}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )}
            </div>

            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {item.order_position && (
                            <span style={{
                                flexShrink: 0, fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99,102,241,0.12)',
                                border: '1px solid rgba(99,102,241,0.25)', width: '22px', height: '22px', borderRadius: '6px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                            }} title="Posição na ordem de disparo (dentro da categoria e tipo de mídia)">
                                {item.order_position}
                            </span>
                        )}
                        <h4 style={{
                            color: '#fff', fontSize: '0.95rem', margin: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }} title={item.filename}>
                            {item.filename}
                        </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.08)',
                            border: '1px solid rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600
                        }}>
                            🏷️ {categories.find(c => c.value === item.category)?.label || item.category}
                        </span>
                        <span style={{
                            fontSize: '0.7rem', color: item.media_type === 'video' ? '#00f2fe' : '#a855f7',
                            background: item.media_type === 'video' ? 'rgba(0,242,254,0.08)' : 'rgba(168,85,247,0.08)',
                            border: item.media_type === 'video' ? '1px solid rgba(0,242,254,0.15)' : '1px solid rgba(168,85,247,0.15)',
                            padding: '2px 8px', borderRadius: '8px', fontWeight: 600, textTransform: 'uppercase'
                        }}>
                            {item.media_type === 'video' ? '📹 Vídeo' : '🖼️ Imagem'}
                        </span>
                        {fileSizeLabel && (
                            <span style={{
                                fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(148,163,184,0.08)',
                                border: '1px solid rgba(148,163,184,0.15)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600
                            }}>
                                💾 {fileSizeLabel}
                            </span>
                        )}
                        {item.caption && (
                            <span style={{
                                fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
                                border: '1px solid rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600
                            }} title={item.caption}>
                                💬 Legenda customizada
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }} title="Reordenar disparo dentro da categoria">
                        <button
                            onClick={() => onMove(item, 'up')}
                            disabled={isFirst}
                            style={{
                                background: 'rgba(255,255,255,0.05)', color: isFirst ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                border: '1px solid rgba(255,255,255,0.08)', width: '30px', height: '30px',
                                borderRadius: '8px', cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            ▲
                        </button>
                        <button
                            onClick={() => onMove(item, 'down')}
                            disabled={isLast}
                            style={{
                                background: 'rgba(255,255,255,0.05)', color: isLast ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                                border: '1px solid rgba(255,255,255,0.08)', width: '30px', height: '30px',
                                borderRadius: '8px', cursor: isLast ? 'not-allowed' : 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            ▼
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onEdit(item)}
                        style={{
                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px',
                            borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        ✏️ Editar
                    </button>
                    <button
                        onClick={() => onDelete(item)}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px',
                            borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        🗑️ Excluir
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TestimonialCard;
