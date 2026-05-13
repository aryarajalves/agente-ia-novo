import React from 'react';

const TemporalGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '🕒', title: 'Consciência Temporal', accent: '#60a5fa',
          desc: <>Quando ativada, o agente recebe automaticamente a <strong style={{color:'#e2e8f0'}}>data e hora atual</strong> injetadas no prompt.</>,
          code: <><span style={{color:'#60a5fa'}}>Data: quinta-feira, 12 de março de 2026{'\n'}Hora: 14:35</span></>,
          tip: 'Essencial para agendamentos e horários de funcionamento.' },
        { icon: '❓', title: 'Por que ativar?', accent: '#4ade80',
          desc: <>Modelos de IA não têm acesso ao relógio. Sem isso, o agente não sabe que dia é hoje.</>,
          code: <><span style={{color:'#4ade80'}}>✅ Com Consciência:</span> "Hoje é 12 de março."</>,
          tip: 'Ative se o agente precisar marcar reuniões ou falar sobre horários.' },
    ];

    return (
        <div className="guide-modal-overlay">
            <div className="guide-modal-card">
                <div className="guide-modal-header">
                    <span className="guide-modal-title">🕒 Guia do Prompt</span>
                    <button className="guide-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="guide-modal-body custom-scrollbar">
                    {items.map((item, i) => (
                        <div key={i} className="guide-item" style={{ borderLeft: `3px solid ${item.accent}` }}>
                            <div className="guide-item-title">{item.icon} {item.title}</div>
                            <p className="guide-item-desc">{item.desc}</p>
                            <pre className="guide-item-code">{item.code}</pre>
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

export default TemporalGuideModal;
