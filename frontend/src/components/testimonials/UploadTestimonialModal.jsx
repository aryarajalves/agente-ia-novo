import React from 'react';

function UploadTestimonialModal({ isOpen, categories, uploadCategory, setUploadCategory, uploading, onFileUpload, onClose }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                background: 'rgba(20, 18, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '450px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px'
            }}>
                <h3 style={{ color: '#fff', fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📤 Enviar Depoimento
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Escolha o Curso/Categoria:</label>
                    <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '12px',
                            borderRadius: '10px', outline: 'none', cursor: 'pointer'
                        }}
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Arquivo (Imagem ou Vídeo):</label>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                        Limite do WhatsApp: imagens até 5MB, vídeos até 16MB.
                    </span>
                    <label
                        style={{
                            border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '14px',
                            padding: '30px 20px', textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            background: 'rgba(255,255,255,0.01)', transition: 'border-color 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>📁</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                            {uploading ? 'Enviando arquivo...' : 'Clique para selecionar arquivo'}
                        </span>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={onFileUpload}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        style={{
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                            padding: '10px 20px', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UploadTestimonialModal;
