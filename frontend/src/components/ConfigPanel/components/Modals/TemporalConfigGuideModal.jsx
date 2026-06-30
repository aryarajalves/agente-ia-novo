import React from 'react';
import ReactDOM from 'react-dom';

const TemporalConfigGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '🕒', title: 'Ativar Consciência Temporal', accent: '#6366f1',
          desc: <>Injeta a data e hora do servidor nas mensagens enviadas ao agente. Sem isso, a IA não sabe em qual dia ou hora a mensagem do cliente foi enviada.</> },
        { icon: '⏪', title: 'Dias Anteriores', accent: '#3b82f6',
          desc: <>Define quantos dias no passado o agente pode considerar no contexto de calendário para verificar agendamentos ou referências temporárias passadas.</> },
        { icon: '⏩', title: 'Dias Posteriores', accent: '#10b981',
          desc: <>Define a janela de dias no futuro em que o agente pode agendar eventos ou considerar datas futuras válidas.</> },
        { icon: '⏰', title: 'Forçar Horário Específico (Opcional)', accent: '#f59e0b',
          desc: <>Permite simular um horário fixo de recebimento das mensagens para testar o comportamento do agente fora do horário de atendimento.</> },
    ];

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
            <div className="premium-modal-content compact" style={{ maxWidth: '480px', padding: '1.5rem', textAlign: 'left', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🕒 Entendendo as Opções Temporais
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
                    {items.map((item, i) => (
                        <div key={i} style={{ borderLeft: `3px solid ${item.accent}`, paddingLeft: '0.75rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.25rem' }}>
                                <span>{item.icon}</span> {item.title}
                            </div>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.4' }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{ 
                            padding: '0.5rem 1.25rem', borderRadius: '8px', 
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', 
                            color: '#94a3b8', fontWeight: 700, cursor: 'pointer', 
                            fontSize: '0.8rem'
                        }}
                    >Fechar</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TemporalConfigGuideModal;
