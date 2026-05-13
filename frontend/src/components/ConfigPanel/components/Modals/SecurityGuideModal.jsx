import React from 'react';

const SecurityGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '🚫', title: 'Tópicos Proibidos', accent: '#f87171',
          desc: <>Liste assuntos que o agente deve <strong style={{color:'#e2e8f0'}}>evitar completamente</strong>.</>,
          tip: 'O agente recebe instrução de alta prioridade para mudar de assunto.' },
        { icon: '🔒', title: 'Ocultar Dados Sensíveis (PII)', accent: '#4ade80',
          desc: <>Filtra dados pessoais na <strong style={{color:'#e2e8f0'}}>resposta final</strong> antes de chegar ao usuário.</>,
          tip: 'Oculta e-mails, CPFs e telefones na resposta.' },
        { icon: '🛡️', title: 'Proteção Anti-Loop', accent: '#818cf8',
          desc: <>Detecta se o usuário está repetindo a mesma mensagem várias vezes.</>,
          tip: 'Bloqueia ataques de loop de bots ou usuários mal-intencionados.' },
    ];

    return (
        <div className="guide-modal-overlay" onClick={onClose}>
            <div className="guide-modal-card" onClick={e => e.stopPropagation()}>
                <div className="guide-modal-header">
                    <span className="guide-modal-title">🛡️ Guia de Segurança</span>
                    <button className="guide-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="guide-modal-body custom-scrollbar">
                    {items.map((item, i) => (
                        <div key={i} className="guide-item" style={{ borderLeft: `3px solid ${item.accent}` }}>
                            <div className="guide-item-title">{item.icon} {item.title}</div>
                            <p className="guide-item-desc">{item.desc}</p>
                            <div className="guide-item-tip">
                                <strong style={{ color: item.accent }}>Dica: </strong>{item.tip}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SecurityGuideModal;
