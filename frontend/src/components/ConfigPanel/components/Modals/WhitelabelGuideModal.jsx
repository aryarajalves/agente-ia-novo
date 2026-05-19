import React from 'react';
import ReactDOM from 'react-dom';

const WhitelabelGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        {
            icon: '🎨', title: 'Cor Primária (Botão e Balões)', accent: '#f9a8d4',
            desc: <>Define a cor do <strong style={{color:'#e2e8f0'}}>botão de envio</strong> e dos <strong style={{color:'#e2e8f0'}}>balões de mensagem do usuário</strong> no chat widget. É a cor de destaque principal da interface.</>,
            code: <><span style={{color:'#475569'}}>{'// Exemplos por tipo de negócio:'}</span>{'\n'}<span style={{color:'#f9a8d4'}}>#e91e8c</span>{' → '}<span style={{color:'#94a3b8'}}>Rosa: beleza, moda, saúde{'\n'}</span><span style={{color:'#3b82f6'}}>#3b82f6</span>{' → '}<span style={{color:'#94a3b8'}}>Azul: tecnologia, financeiro, jurídico{'\n'}</span><span style={{color:'#22c55e'}}>#22c55e</span>{' → '}<span style={{color:'#94a3b8'}}>Verde: saúde, sustentabilidade, educação</span></>,
            tip: 'Use a cor principal da marca do cliente para o widget parecer nativo ao site.'
        },
        {
            icon: '🖥️', title: 'Cor do Cabeçalho', accent: '#c084fc',
            desc: <>Cor de fundo da <strong style={{color:'#e2e8f0'}}>barra superior do chat</strong>, onde fica o nome do atendente/agente. Geralmente acompanha a cor primária ou usa a cor secundária da marca.</>,
            code: <><span style={{color:'#475569'}}>{'// Combinações comuns:'}</span>{'\n'}<span style={{color:'#c084fc'}}>Cabeçalho escuro (#1e1b4b)</span>{' + '}<span style={{color:'#f9a8d4'}}>Cor primária vibrante</span>{' → '}<span style={{color:'#94a3b8'}}>Contraste elegante{'\n'}</span><span style={{color:'#c084fc'}}>Cabeçalho = Cor primária</span>{' → '}<span style={{color:'#94a3b8'}}>Visual uniforme e coeso</span></>,
            tip: 'Tons escuros no cabeçalho transmitem seriedade e profissionalismo. Claro combina com marcas jovens.'
        },
        {
            icon: '✏️', title: 'Nome do Chat (Título)', accent: '#38bdf8',
            desc: <>Texto exibido no cabeçalho do chat widget, identificando o atendente ou o serviço. O usuário vê esse nome ao abrir o chat no site.</>,
            code: <><span style={{color:'#475569'}}>{'// Exemplos de título:'}</span>{'\n'}<span style={{color:'#38bdf8'}}>Suporte ao Cliente</span>{'\n'}<span style={{color:'#38bdf8'}}>Assistente da Loja</span>{'\n'}<span style={{color:'#38bdf8'}}>Ana — Consultora Virtual</span></>,
            tip: 'Use o nome do personagem do agente ou "Suporte [Nome da Empresa]" para humanizar o atendimento.'
        },
        {
            icon: '🔧', title: 'Código de Instalação (Widget)', accent: '#34d399',
            desc: <>Snippet HTML gerado automaticamente com as configurações do agente. Cole esse código no site do cliente para ativar o chat sem necessidade de configuração adicional.</>,
            code: <><span style={{color:'#475569'}}>{'<!-- Cole antes de </body> no HTML do site -->'}</span>{'\n'}<span style={{color:'#34d399'}}>{'<script'}</span>{'\n'}<span style={{color:'#94a3b8'}}>{'  src="...widget.js"'}{'\n'}{'  data-agent-id="..."'}{'\n'}{'  data-title="..."'}</span>{'\n'}<span style={{color:'#34d399'}}>{'></script>'}</span></>,
            tip: 'Funciona em qualquer site HTML: WordPress, Webflow, Wix, Shopify ou sites estáticos. Clique em "Copiar Código" e cole no painel do site.'
        },
        {
            icon: '👁️', title: 'Preview em Tempo Real', accent: '#fbbf24',
            desc: <>Visualização ao vivo do widget com as cores e título configurados. Atualiza instantaneamente conforme você ajusta as configurações, sem precisar salvar para ver o resultado.</>,
            code: <><span style={{color:'#fbbf24'}}>Preview mostra exatamente como o widget vai aparecer no site do cliente.</span>{'\n'}<span style={{color:'#94a3b8'}}>✓ Cor do cabeçalho{'\n'}✓ Cor dos balões e botão{'\n'}✓ Nome do chat{'\n'}✓ Mensagem de boas-vindas</span></>,
            tip: 'Teste diferentes combinações de cores no preview antes de salvar e instalar no site.'
        },
    ];

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card">
                <div className="guide-modal-header">
                    <span className="guide-modal-title">🎨 Guia do Whitelabel</span>
                    <button className="guide-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="guide-modal-body custom-scrollbar">
                    {items.map((item, i) => (
                        <div key={i} className="guide-item" style={{ borderLeft: `3px solid ${item.accent}` }}>
                            <div className="guide-item-title">{item.icon} {item.title}</div>
                            <p className="guide-item-desc">{item.desc}</p>
                            {item.code && <pre className="guide-item-code">{item.code}</pre>}
                            <div className="guide-item-tip">
                                <strong style={{ color: item.accent }}>Dica: </strong>{item.tip}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default WhitelabelGuideModal;
