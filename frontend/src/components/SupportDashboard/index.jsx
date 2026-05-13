import React from 'react';
import { SupportProvider, useSupport } from './SupportContext';
import { useSupportData } from './hooks/useSupportData';
import Header from './components/Header';
import FilaSuporte from './components/FilaSuporte';
import ConfirmModal from '../ConfirmModal';
import { useSupportActions } from './hooks/useSupportActions';
import './styles/SupportDashboard.css';

const DashboardContent = () => {
    const { 
        loading, requests, selectedIds, setSelectedIds,
        showGuide, setShowGuide,
        confirmResolve, setConfirmResolve,
        errorLogsModal, setErrorLogsModal,
        batchConfirmResolve, setBatchConfirmResolve,
        batchConfirmDelete, setBatchConfirmDelete
    } = useSupport();
    const { resolveTicket, batchResolveTickets, deleteTickets } = useSupportActions();
    
    useSupportData();

    if (loading) {
        return (
            <div className="support-dashboard loading">
                <div className="spinner"></div>
                <p>Carregando fila de suporte...</p>
            </div>
        );
    }

    return (
        <div className="support-dashboard fade-in">
            <Header />
            
            {selectedIds.length > 0 && (
                <div className="selection-bar">
                    <span>{selectedIds.length} chamados selecionados</span>
                    <div className="selection-actions">
                        <button className="btn-selection-action" onClick={() => setSelectedIds([])}>Limpar</button>
                        <button className="btn-selection-action" onClick={() => setBatchConfirmDelete(true)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Excluir Selecionados</button>
                        <button className="btn-selection-action" onClick={() => setBatchConfirmResolve(true)} style={{ background: 'white', color: '#6366f1' }}>Finalizar Atendimento Selecionados</button>
                    </div>
                </div>
            )}

            <FilaSuporte />
            
            {/* Modal de Guia */}
            <ConfirmModal
                isOpen={showGuide}
                title="📖 Guia de Suporte Humano"
                message={
                    <div style={{ textAlign: 'left', fontSize: '0.95rem' }}>
                        <p>Bem-vindo ao painel de Suporte Humano. Aqui você gerencia os transbordos que a IA não conseguiu resolver.</p>
                        <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#cbd5e1' }}>
                            <li style={{ marginBottom: '8px' }}><strong>📋 Logs:</strong> Clique para ver os dados extraídos pela IA e o contexto da conversa.</li>
                            <li style={{ marginBottom: '8px' }}><strong>✅ Finalizar:</strong> Use para encerrar o chamado após resolver o problema do cliente.</li>
                            <li><strong>🎯 Seleção:</strong> Clique no ícone de check no card para selecionar múltiplos chamados.</li>
                        </ul>
                    </div>
                }
                onConfirm={() => setShowGuide(false)}
                onCancel={null}
                confirmText="Fechar"
                cancelText={null}
                type="primary"
            />

            {/* Modal de Confirmação de Finalização */}
            <ConfirmModal
                isOpen={!!confirmResolve}
                title="Confirmar Finalização"
                message={`Deseja realmente encerrar o atendimento para ${confirmResolve?.user_name || 'este usuário'}?`}
                onConfirm={async () => {
                    await resolveTicket(confirmResolve.id);
                    setConfirmResolve(null);
                }}
                onCancel={() => setConfirmResolve(null)}
                confirmText="Finalizar Agora"
                cancelText="Voltar"
                type="success"
            />

            {/* Modal de Logs / Detalhes */}
            <ConfirmModal
                isOpen={!!errorLogsModal}
                title="📋 Detalhes do Chamado"
                message={
                    <div style={{ textAlign: 'left', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <h4 style={{ color: '#818cf8', marginBottom: '4px', fontSize: '0.9rem' }}>Dados do Usuário</h4>
                            <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Nome:</strong> {errorLogsModal?.user_name}</p>
                            <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Email:</strong> {errorLogsModal?.user_email}</p>
                            <p style={{ fontSize: '0.85rem', margin: '2px 0' }}><strong>Sessão:</strong> {errorLogsModal?.session_id}</p>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <h4 style={{ color: '#10b981', marginBottom: '4px', fontSize: '0.9rem' }}>Contexto do Transbordo</h4>
                            <p style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', margin: 0 }}>
                                {errorLogsModal?.reason}
                            </p>
                        </div>
                        {errorLogsModal?.extracted_data && (
                            <div>
                                <h4 style={{ color: '#f59e0b', marginBottom: '4px', fontSize: '0.9rem' }}>Dados Coletados (JSON)</h4>
                                <pre style={{ 
                                    fontSize: '0.75rem', 
                                    background: '#0f172a', 
                                    padding: '12px', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: '#94a3b8',
                                    margin: 0
                                }}>
                                    {JSON.stringify(errorLogsModal.extracted_data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                }
                onConfirm={() => setErrorLogsModal(null)}
                onCancel={null}
                confirmText="Fechar"
                cancelText={null}
                type="info"
            />

            {/* Modal de Confirmação em Lote - Finalizar */}
            <ConfirmModal
                isOpen={batchConfirmResolve}
                title="🎯 Finalizar em Lote"
                message={`Deseja finalizar simultaneamente os ${selectedIds.length} chamados selecionados?`}
                onConfirm={async () => {
                    await batchResolveTickets(selectedIds);
                    setBatchConfirmResolve(false);
                }}
                onCancel={() => setBatchConfirmResolve(false)}
                confirmText="Sim, Finalizar Tudo"
                cancelText="Cancelar"
                type="success"
            />

            {/* Modal de Confirmação em Lote - Excluir */}
            <ConfirmModal
                isOpen={batchConfirmDelete}
                title="⚠️ Excluir em Lote"
                message={`Deseja EXCLUIR permanentemente os ${selectedIds.length} chamados selecionados? Esta ação não pode ser desfeita.`}
                onConfirm={async () => {
                    await deleteTickets(selectedIds);
                    setBatchConfirmDelete(false);
                }}
                onCancel={() => setBatchConfirmDelete(false)}
                confirmText="Sim, Excluir Definitivamente"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

const SupportDashboard = () => (
    <SupportProvider>
        <DashboardContent />
    </SupportProvider>
);

export default SupportDashboard;
