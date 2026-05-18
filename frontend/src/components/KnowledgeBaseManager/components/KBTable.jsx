import React from 'react';
import { useKB } from '../KBContext';
import { useKBData } from '../hooks/useKBData';
import { useKBOperations } from '../hooks/useKBOperations';

const KBTable = () => {
    const { 
        kbFilterTerm, setKbFilterTerm, 
        selectedItems,
        kbLabels, setItemToDelete, setIsConfirmOpen,
        itemsPerPage, setItemsPerPage,
        typeFilter, setTypeFilter,
        currentPage, setCurrentPage
    } = useKB();
    
    const { paginatedItems, totalPages, totalCount } = useKBData();
    const { toggleSelect, toggleSelectAll } = useKBOperations();

    return (
        <div className="kb-table-container fade-in">
            <div className="kb-table-header">
                <input 
                    type="text" 
                    placeholder="Filtrar na base..." 
                    value={kbFilterTerm}
                    onChange={e => setKbFilterTerm(e.target.value)}
                    className="kb-search-input"
                />
                <div className="kb-stats" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <select 
                        value={typeFilter} 
                        onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '8px' }}
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="qa">Apenas P&R</option>
                        <option value="chunks">Apenas Chunks</option>
                    </select>

                    <select 
                        value={itemsPerPage} 
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '8px' }}
                    >
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                    </select>
                    <span>Total: {totalCount} itens</span>
                    
                    {selectedItems.size > 0 && (
                        <button 
                            onClick={() => {
                                setIsConfirmOpen(true);
                            }}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            🗑️ Excluir Selecionados ({selectedItems.size})
                        </button>
                    )}
                </div>
            </div>

            <table className="kb-table">
                <thead>
                    <tr>
                        <th>
                            <input 
                                type="checkbox" 
                                checked={selectedItems.size > 0 && selectedItems.size === paginatedItems.length}
                                onChange={() => toggleSelectAll(paginatedItems)}
                            />
                        </th>
                        <th>{kbLabels.question}</th>
                        <th>{kbLabels.answer}</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedItems.map((item) => (
                        <tr key={item.id}>
                            <td>
                                <input 
                                    type="checkbox" 
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => toggleSelect(item.id)}
                                />
                            </td>
                            <td>{item.question}</td>
                            <td>{item.answer}</td>
                            <td>
                                <button onClick={() => {
                                    setItemToDelete({ id: item.id, index: item.originalIndex });
                                    setIsConfirmOpen(true);
                                }}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {totalPages >= 1 && (
                <div className="kb-pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                    <span>Página {currentPage} de {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</button>
                </div>
            )}
        </div>
    );
};

export default KBTable;
