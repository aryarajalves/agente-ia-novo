import React from 'react';

const WhitelabelGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '🎨', title: 'Cor Primária', accent: '#f9a8d4',
          desc: <>Define a cor do botão de envio e dos balões de mensagem do usuário.</>,
          tip: 'Use a cor principal da marca do cliente.' },
        { icon: '🖥️', title: 'Cor do Cabeçalho', accent: '#c084fc',
          desc: <>Cor de fundo da barra superior do chat.</>,
          tip: 'Tons escuros costumam passar mais seriedade.' },
        { icon: '🔧', title: 'Código de Instalação', accent: '#34d399',
          desc: <>Snippet HTML para colar no site e ativar o chat.</>,
          tip: 'Funciona em WordPress, Webflow e sites estáticos.' },
    ];

    return (
        <div className="guide-modal-overlay" onClick={onClose}>
            <div className="guide-modal-card" onClick={e => e.stopPropagation()}>
                <div className="guide-modal-header">
                    <span className="guide-modal-title">🎨 Guia do Whitelabel</span>
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

export default WhitelabelGuideModal;
