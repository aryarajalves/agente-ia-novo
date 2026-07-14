import React from 'react';

function EditTestimonialModal({
    isOpen, testimonial, categories,
    editCategory, setEditCategory,
    editCaption, setEditCaption,
    editFilename, setEditFilename,
    editPosition, setEditPosition,
    maxPosition,
    saving, onSave, onClose
}) {
    if (!isOpen || !testimonial) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                background: 'rgba(20, 18, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '480px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px'
            }}>
                <h3 style={{ color: '#fff', fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✏️ Editar Depoimento
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Nome do arquivo:</label>
                    <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        disabled={saving}
                        placeholder="Ex: depoimento-aluna-marcia.png"
                        style={{
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '12px',
                            borderRadius: '10px', outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Posição na ordem de disparo (dentro da categoria):</label>
                    <input
                        type="number"
                        min={1}
                        max={maxPosition}
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                        disabled={saving}
                        style={{
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '12px',
                            borderRadius: '10px', outline: 'none', width: '120px'
                        }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        1 = enviado primeiro. Os demais depoimentos da mesma categoria são reordenados automaticamente para abrir espaço.
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Curso/Categoria:</label>
                    <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        disabled={saving}
                        style={{
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '12px',
                            borderRadius: '10px', outline: 'none', cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Legenda enviada junto da mídia no WhatsApp:</label>
                    <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        disabled={saving}
                        placeholder="Ex: Depoimento de aluno do curso Método Laser Day 🚀"
                        rows={3}
                        style={{
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '12px',
                            borderRadius: '10px', outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                        }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        Deixe em branco para enviar a mídia sozinha, sem nenhum texto junto.
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                            padding: '10px 20px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', padding: '10px 20px',
                            borderRadius: '10px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditTestimonialModal;
