import React from 'react';

const TesterReportModal = ({ testerReport, isGeneratingReport, setTesterReport }) => {
    if (!testerReport && !isGeneratingReport) return null;

    return (
        <div className="modal-overlay fade-in" style={{ zIndex: 3000 }}>
            <div className="modal-content report-modal" style={{ maxWidth: '600px', background: '#0f172a', border: '1px solid #f43f5e' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid rgba(244, 63, 94, 0.2)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📊</span> Relatório de Auditoria de Stress Test
                    </h3>
                </div>
                <div className="modal-body custom-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px', paddingRight: '10px', margin: '10px 0' }}>
                    {isGeneratingReport ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div className="loading-dots" style={{ marginBottom: '20px' }}><span></span><span></span><span></span></div>
                            <p>Nossa IA Auditora está analisando a performance do seu agente...</p>
                        </div>
                    ) : (
                        <div className="auditor-report fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px', background: 'rgba(244, 63, 94, 0.1)', padding: '15px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fb7185' }}>{testerReport?.score || 0}/10</div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Score Geral de Desempenho</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Baseado em paciência, resolução e aderência ao prompt.</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>✅ Pontos Fortes</h4>
                                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                    {testerReport?.strengths?.map?.((s, i) => <li key={i} style={{ marginBottom: '5px', fontSize: '0.9rem' }}>{s}</li>)}
                                </ul>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>❌ Pontos de Melhoria</h4>
                                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                    {testerReport?.weaknesses?.map?.((w, i) => <li key={i} style={{ marginBottom: '5px', fontSize: '0.9rem' }}>{w}</li>)}
                                </ul>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                                <h4 style={{ color: '#f59e0b', fontSize: '0.9rem' }}>💡 Sugestão para o Programador:</h4>
                                <p style={{ marginTop: '8px', fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.9 }}>
                                    {testerReport?.recommendation || "Sem sugestões no momento."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                {!isGeneratingReport && (
                    <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button className="primary-action-btn" onClick={() => setTesterReport(null)} style={{ background: '#f43f5e' }}>
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TesterReportModal;
