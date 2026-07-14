import React from 'react';
import { createPortal } from 'react-dom';
import { useKB } from '../KBContext';
import ConfirmModal from '../../ConfirmModal';
import { useKBOperations } from '../hooks/useKBOperations';
import EditItemModal from './EditItemModal';

const Modals = () => {
    const { 
        isConfirmOpen, setIsConfirmOpen,
        itemToDelete, setItemToDelete,
        selectedItems,
        isDeleting,
        showSuccessModal, setShowSuccessModal
    } = useKB();
    
    const { confirmDeletion, confirmBulkDelete } = useKBOperations();

    const handleConfirm = () => {
        if (selectedItems.size > 0) {
            confirmBulkDelete();
        } else {
            confirmDeletion(itemToDelete);
        }
    };

    return (
        <>
            <EditItemModal />

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Excluir Conteúdo"
                message={selectedItems.size > 0 ? `Excluir ${selectedItems.size} itens?` : "Excluir este item?"}
                confirmText="Excluir"
                onConfirm={handleConfirm}
                onCancel={() => { setIsConfirmOpen(false); setItemToDelete(null); }}
                isLoading={isDeleting}
                type="danger"
            />

            {showSuccessModal && document.body && createPortal(
                <div className="success-modal-overlay">
                    <div className="success-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="success-icon">✨</div>
                        <h3>Sucesso!</h3>
                        <p>A operação foi concluída com êxito.</p>
                        <button onClick={() => setShowSuccessModal(false)}>Fechar</button>
                    </div>
                </div>, document.body
            )}
        </>
    );
};

export default Modals;
