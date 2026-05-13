import React from 'react';

const HabilidadesGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '📚', title: 'Base de Conhecimento (RAG)', accent: '#4ade80',
          desc: <>Vincula documentos ao agente. Ao receber uma pergunta, o sistema busca os trechos mais relevantes e os injeta no contexto.</>,
          tip: 'Ideal para FAQs, manuais e catálogos de produtos.' },
        { icon: '🌍', title: 'Tradução Automática', accent: '#60a5fa',
          desc: <>Traduz a pergunta do usuário para o idioma da base antes de procurar. Útil para atendimento internacional.</>,
          tip: 'Usa o LLM principal para traduzir a busca.' },
        { icon: '🛠️', title: 'Ações & Ferramentas', accent: '#c084fc',
          desc: <>Conecta o agente a sistemas externos (CRM, ERP, Google Calendar) via API ou Webhook.</>,
          tip: 'O modelo decide sozinho quando usar cada ferramenta.' },
    ];

    return (
        <div className="guide-modal-overlay" onClick={onClose}>
            <div className="guide-modal-card" onClick={e => e.stopPropagation()}>
                <div className="guide-modal-header">
                    <span className="guide-modal-title">⚡ Guia das Habilidades</span>
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

export default HabilidadesGuideModal;
