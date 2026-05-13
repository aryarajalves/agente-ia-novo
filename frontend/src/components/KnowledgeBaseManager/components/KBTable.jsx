import React from 'react';
import { useKB } from '../KBContext';
import { useKBData } from '../hooks/useKBData';
import { useKBOperations } from '../hooks/useKBOperations';

const KBTable = () => {
    const { 
        kbFilterTerm, setKbFilterTerm, 
        selectedItems,
        kbLabels, setItemToDelete, setIsConfirmOpen
    } = useKB();
    
    const { paginatedItems, totalPages, currentPage, setCurrentPage, totalCount } = useKBData();
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
                <div className="kb-stats">
                    Total: {totalCount} itens
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

            {totalPages > 1 && (
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
