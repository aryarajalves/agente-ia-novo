import React, { useState, useEffect } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';


const RagBatchModal = () => {
    const { isBatchRagModalOpen, setIsBatchRagModalOpen, selectedIds, knowledgeBases } = useTranscription();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedKbId, setSelectedKbId] = useState('');

    if (!isBatchRagModalOpen) return null;

    const handleConfirm = async () => {
        if (!selectedKbId) {
            alert('Selecione uma base de destino');
            return;
        }

        setIsProcessing(true);
        try {
            // Lógica para processar em lote e enviar para a base RAG
            alert('Processamento em lote iniciado');
            setIsBatchRagModalOpen(false);
        } catch (error) {
            alert('Erro ao processar lote');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-content" style={{
                background: '#0f172a', border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '2.5rem', borderRadius: '24px', width: '500px'
            }}>
                <h2 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    🚀 Resumo em Lote (RAG)
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                    Você selecionou <strong>{selectedIds.size}</strong> transcrições para enviar à base de conhecimento.
                </p>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Base de Destino</label>
                    <select 
                        value={selectedKbId} 
                        onChange={(e) => setSelectedKbId(e.target.value)}
                        style={{ width: '100%', padding: '1rem', background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white' }}
                    >
                        <option value="">Selecione uma base...</option>
                        {knowledgeBases.map(kb => (
                            <option key={kb.id} value={kb.id}>{kb.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={() => setIsBatchRagModalOpen(false)} 
                        className="refresh-btn"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isProcessing}
                        className="create-btn"
                    >
                        {isProcessing ? 'Processando...' : '🚀 Gerar Conhecimento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RagBatchModal;
