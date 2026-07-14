import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';
import TestimonialCard from './testimonials/TestimonialCard';
import UploadTestimonialModal from './testimonials/UploadTestimonialModal';
import EditTestimonialModal from './testimonials/EditTestimonialModal';
import ManageCategoriesModal from './testimonials/ManageCategoriesModal';

function TestimonialsManager() {
    const [testimonials, setTestimonials] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [mediaTypeFilter, setMediaTypeFilter] = useState('all');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Estado de Upload e Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploading, setUploading] = useState(false);

    const [loading, setLoading] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState(null);

    // Estado do Modal de Edição (categoria + legenda)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [testimonialToEdit, setTestimonialToEdit] = useState(null);
    const [editCategory, setEditCategory] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Estados de Categoria
    const [categories, setCategories] = useState([]);
    const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);

    const loadCategories = async () => {
        try {
            const response = await api.get('/testimonials/categories');
            if (response.ok) {
                const data = await response.json();
                const mapped = (data || []).map(c => ({ id: c.id, value: c.value, label: c.name }));
                setCategories(mapped);
                if (mapped.length > 0 && !uploadCategory) {
                    setUploadCategory(mapped[0].value);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar categorias:", err);
        }
    };

    const loadTestimonials = async () => {
        setLoading(true);
        try {
            // Busca todos os depoimentos (filtramos no frontend para suportar paginação e filtros cruzados de forma ultra fluida)
            const response = await api.get(`/testimonials`);
            if (response.ok) {
                const data = await response.json();
                setTestimonials(data);
            }
        } catch (err) {
            console.error("Erro ao carregar depoimentos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTestimonials();
        loadCategories();
    }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            const response = await api.post('/testimonials/categories', { name: newCategoryName });
            const data = await response.json();
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Categoria criada com sucesso!', type: 'success' } }));
                setNewCategoryName('');
                loadCategories();
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: data.detail || 'Erro ao criar categoria.', type: 'error' } }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao conectar ao servidor.', type: 'error' } }));
        }
    };

    const handleDeleteCategoryClick = (category) => {
        setCategoryToDelete(category);
        setDeleteCategoryConfirmOpen(true);
    };

    const confirmDeleteCategory = async () => {
        if (!categoryToDelete) return;
        setDeleteCategoryConfirmOpen(false);

        try {
            const response = await api.delete(`/testimonials/categories/${categoryToDelete.id}`);
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Categoria e depoimentos associados excluídos!', type: 'success' } }));
                loadCategories();
                loadTestimonials();
            } else {
                const data = await response.json();
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: data.detail || 'Erro ao excluir categoria.', type: 'error' } }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao conectar ao servidor.', type: 'error' } }));
        } finally {
            setCategoryToDelete(null);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);

        setUploading(true);
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Iniciando upload do depoimento...', type: 'info' } }));

        try {
            const response = await api.post('/testimonials/upload', formData);
            const data = await response.json();
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Depoimento enviado com sucesso!', type: 'success' } }));
                setUploadModalOpen(false);
                loadTestimonials();
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: data.detail || 'Erro ao enviar depoimento.', type: 'error' } }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro de conexão ao enviar arquivo.', type: 'error' } }));
        } finally {
            setUploading(false);
            e.target.value = ''; // Limpa input
        }
    };

    const handleDeleteClick = (testimonial) => {
        setTestimonialToDelete(testimonial);
        setDeleteModalOpen(true);
    };

    const handleEditClick = (testimonial) => {
        setTestimonialToEdit(testimonial);
        setEditCategory(testimonial.category);
        setEditCaption(testimonial.caption || '');
        setEditModalOpen(true);
    };

    const handleCloseEdit = () => {
        setEditModalOpen(false);
        setTestimonialToEdit(null);
    };

    const handleSaveEdit = async () => {
        if (!testimonialToEdit) return;
        setSavingEdit(true);

        try {
            const response = await api.patch(`/testimonials/${testimonialToEdit.id}`, {
                category: editCategory,
                caption: editCaption
            });
            const data = await response.json();
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Depoimento atualizado com sucesso!', type: 'success' } }));
                setTestimonials(prev => prev.map(t => t.id === testimonialToEdit.id ? { ...t, category: data.category, caption: data.caption } : t));
                handleCloseEdit();
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: data.detail || 'Erro ao atualizar depoimento.', type: 'error' } }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao conectar ao servidor.', type: 'error' } }));
        } finally {
            setSavingEdit(false);
        }
    };

    const confirmDelete = async () => {
        if (!testimonialToDelete) return;
        setDeleteModalOpen(false);

        try {
            const response = await api.delete(`/testimonials/${testimonialToDelete.id}`);
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Depoimento excluído com sucesso!', type: 'success' } }));
                setTestimonials(testimonials.filter(t => t.id !== testimonialToDelete.id));
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao excluir depoimento.', type: 'error' } }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao conectar ao servidor.', type: 'error' } }));
        } finally {
            setTestimonialToDelete(null);
        }
    };

    // Função de Fallback de Rede: se falhar o carregamento via localhost, tenta 127.0.0.1
    const handleMediaError = (e) => {
        const currentSrc = e.target.src;
        if (currentSrc && currentSrc.includes('localhost:9008')) {
            e.target.src = currentSrc.replace('localhost:9008', '127.0.0.1:9008');
        }
    };

    // Filtros cruzados aplicados no frontend
    const filteredTestimonials = testimonials.filter(item => {
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchType = mediaTypeFilter === 'all' || item.media_type === mediaTypeFilter;
        return matchCategory && matchType;
    });

    // Paginação lógica
    const totalItems = filteredTestimonials.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = filteredTestimonials.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Ajusta página atual se os filtros reduzirem o número de itens
    useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, mediaTypeFilter, pageSize]);

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>
                <h1 className="panel-title" style={{ fontSize: '2.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                        width: '50px', height: '50px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px -5px rgba(16, 185, 129, 0.4)'
                    }}>
                        <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>💬</span>
                    </div>
                    Gerenciador de Depoimentos
                </h1>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setManageCategoriesOpen(true)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '12px 24px', borderRadius: '12px',
                            color: '#fff', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        📁 Gerenciar Categorias
                    </button>

                    <button
                        onClick={() => setUploadModalOpen(true)}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            padding: '12px 24px', borderRadius: '12px', border: 'none',
                            color: '#fff', fontWeight: 600, cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        ➕ Enviar Novo Depoimento
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div style={{
                display: 'flex', gap: '20px', background: 'rgba(20, 18, 30, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px',
                borderRadius: '16px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>Filtrar Curso/Categoria:</label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.25)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                            borderRadius: '10px', outline: 'none', cursor: 'pointer', minWidth: '180px'
                        }}
                    >
                        <option value="all">📁 Todos os Cursos</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>Filtrar Tipo de Mídia:</label>
                    <select
                        value={mediaTypeFilter}
                        onChange={(e) => setMediaTypeFilter(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.25)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                            borderRadius: '10px', outline: 'none', cursor: 'pointer', minWidth: '150px'
                        }}
                    >
                        <option value="all">🎬 Todas as Mídias</option>
                        <option value="image">🖼️ Imagens / Fotos</option>
                        <option value="video">📹 Vídeos</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: 'auto' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>Exibir por Página:</label>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        style={{
                            background: 'rgba(0,0,0,0.25)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px',
                            borderRadius: '10px', outline: 'none', cursor: 'pointer', width: '90px'
                        }}
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ borderTopColor: '#10b981' }}></div>
                    <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>Carregando depoimentos...</p>
                </div>
            ) : paginatedItems.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem 2rem', background: 'rgba(20, 18, 30, 0.2)',
                    border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px'
                }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📂</span>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Nenhum depoimento encontrado</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Não há mídias correspondentes aos filtros aplicados.</p>
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px'
                    }}>
                        {paginatedItems.map(item => (
                            <TestimonialCard
                                key={item.id}
                                item={item}
                                categories={categories}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                onMediaError={handleMediaError}
                            />
                        ))}
                    </div>

                    {/* PAGINAÇÃO CONTROLES */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '2.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '8px 16px', borderRadius: '10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === 1 ? 0.4 : 1, fontWeight: 600
                                }}
                            >
                                ‹ Anterior
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '8px 16px', borderRadius: '10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage === totalPages ? 0.4 : 1, fontWeight: 600
                                }}
                            >
                                Próxima ›
                            </button>
                        </div>
                    )}
                </>
            )}

            <UploadTestimonialModal
                isOpen={uploadModalOpen}
                categories={categories}
                uploadCategory={uploadCategory}
                setUploadCategory={setUploadCategory}
                uploading={uploading}
                onFileUpload={handleFileUpload}
                onClose={() => setUploadModalOpen(false)}
            />

            <EditTestimonialModal
                isOpen={editModalOpen}
                testimonial={testimonialToEdit}
                categories={categories}
                editCategory={editCategory}
                setEditCategory={setEditCategory}
                editCaption={editCaption}
                setEditCaption={setEditCaption}
                saving={savingEdit}
                onSave={handleSaveEdit}
                onClose={handleCloseEdit}
            />

            <ManageCategoriesModal
                isOpen={manageCategoriesOpen}
                categories={categories}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                onCreateCategory={handleCreateCategory}
                onDeleteCategoryClick={handleDeleteCategoryClick}
                onClose={() => setManageCategoriesOpen(false)}
            />

            <ConfirmModal
                isOpen={deleteCategoryConfirmOpen}
                onCancel={() => setDeleteCategoryConfirmOpen(false)}
                onConfirm={confirmDeleteCategory}
                title="Excluir Categoria"
                message={`Deseja realmente excluir a categoria "${categoryToDelete?.label}"? Todos os depoimentos vinculados a ela também serão permanentemente excluídos do storage e do banco.`}
            />

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Depoimento"
                message={`Deseja realmente excluir o depoimento "${testimonialToDelete?.filename}"? Esta ação removerá permanentemente o arquivo do storage e não poderá ser desfeita.`}
            />
        </div>
    );
}

export default TestimonialsManager;
