import React from 'react';

function ManageCategoriesModal({
    isOpen, categories,
    newCategoryName, setNewCategoryName,
    onCreateCategory, onDeleteCategoryClick, onClose
}) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '500px',
                display: 'flex', flexDirection: 'column', gap: '20px',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📁 Gerenciar Categorias
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Formulário de Criação */}
                <form onSubmit={onCreateCategory} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Nova Categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        style={{
                            flex: 1, background: 'rgba(0,0,0,0.3)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)', padding: '10px 14px',
                            borderRadius: '10px', outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', padding: '10px 20px',
                            borderRadius: '10px', fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        Adicionar
                    </button>
                </form>

                {/* Lista de Categorias com Opção de Exclusão */}
                <div style={{
                    maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                    paddingRight: '4px'
                }}>
                    {categories.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>
                            Nenhuma categoria cadastrada.
                        </p>
                    ) : (
                        categories.map(cat => (
                            <div
                                key={cat.id || cat.value}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px'
                                }}
                            >
                                <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                                    {cat.label} <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>({cat.value})</span>
                                </span>
                                <button
                                    onClick={() => onDeleteCategoryClick(cat)}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#ef4444',
                                        cursor: 'pointer', fontSize: '1rem', padding: '4px',
                                        borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    title="Excluir Categoria"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                            padding: '10px 20px', borderRadius: '10px', cursor: 'pointer'
                        }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ManageCategoriesModal;
