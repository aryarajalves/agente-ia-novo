import React from 'react';
import ReactDOM from 'react-dom';

const GeralGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        { icon: '🏷️', title: 'Nome do Agente', accent: '#60a5fa',
          desc: <>O nome de identificação do agente na plataforma. Use um nome <strong style={{color:'#e2e8f0'}}>descritivo e único</strong> para facilitar a gestão.</>,
          code: <><span style={{color:'#475569'}}>{'// Exemplos:'}</span>{'\n'}<span style={{color:'#60a5fa'}}>Suporte ao Cliente</span>{'\n'}<span style={{color:'#60a5fa'}}>Assistente de Vendas</span>{'\n'}<span style={{color:'#60a5fa'}}>FAQ Técnico</span></>,
          tip: 'O nome é visível apenas internamente na plataforma, não afeta o comportamento do agente.' },
        { icon: '🧠', title: 'Modelo Principal', accent: '#4ade80',
          desc: <>O modelo de IA que processa as mensagens. Cada modelo tem diferentes capacidades, velocidades e <strong style={{color:'#e2e8f0'}}>custos por 1M tokens</strong>.</>,
          code: <><span style={{color:'#60a5fa'}}>gpt-4o</span>{' → '}<span style={{color:'#94a3b8'}}>Versátil, excelente custo-benefício{'\n'}</span><span style={{color:'#a78bfa'}}>gpt-5 / o3</span>{' → '}<span style={{color:'#94a3b8'}}>Raciocínio avançado, mais caro{'\n'}</span><span style={{color:'#4ade80'}}>gemini-2.0-flash</span>{' → '}<span style={{color:'#94a3b8'}}>Rápido e multimodal</span></>,
          tip: 'O preço exibido é por 1M tokens. Um usuário médio consome ~1.000 tokens por conversa.' },
        { icon: '⛑️', title: 'Modelo de Fallback', accent: '#fbbf24',
          desc: <>Modelo reserva ativado <strong style={{color:'#e2e8f0'}}>automaticamente</strong> quando o modelo principal falha ou está indisponível.</>,
          code: <><span style={{color:'#475569'}}>{'// Fluxo de execução:'}</span>{'\n'}<span style={{color:'#4ade80'}}>Principal disponível</span>{' → '}<span style={{color:'#94a3b8'}}>Usa o principal{'\n'}</span><span style={{color:'#f87171'}}>Principal falhou</span>{' → '}<span style={{color:'#fbbf24'}}>Fallback ativado automaticamente</span></>,
          tip: 'Recomendado para ambientes de produção. Use um modelo mais barato e estável como fallback (ex: gpt-4o-mini).' },
        { icon: '🚦', title: 'Roteamento de Modelos (Cost Router)', accent: '#86efac',
          desc: <>Analisa cada pergunta e decide automaticamente se ela é <strong style={{color:'#e2e8f0'}}>simples ou complexa</strong>, usando o modelo mais barato possível.</>,
          code: <><span style={{color:'#475569'}}>{'// "Qual o horário de funcionamento?" → '}</span><span style={{color:'#4ade80'}}>Modelo Simples (barato){'\n'}</span><span style={{color:'#475569'}}>{'// "Analise esse contrato e aponte riscos" → '}</span><span style={{color:'#a78bfa'}}>Modelo Complexo</span></>,
          tip: '⚡ Pode reduzir custos em até 90%. Configure o Modelo Simples para perguntas do dia a dia e o Complexo para análises profundas.' },
        { icon: '💬', title: 'Janela de Contexto', accent: '#a5b4fc',
          desc: <>Quantas mensagens anteriores da conversa são enviadas ao modelo a cada requisição. <strong style={{color:'#e2e8f0'}}>Mais contexto = mais memória</strong>, porém maior custo.</>,
          code: <><span style={{color:'#475569'}}>{'// Janela = 5 msgs:'}</span>{'\n'}<span style={{color:'#94a3b8'}}>Usuário vê últimas 5 trocas de mensagens{'\n'}</span><span style={{color:'#475569'}}>{'// Janela = 1 msg:'}</span>{'\n'}<span style={{color:'#94a3b8'}}>Agente "esquece" o início da conversa</span></>,
          tip: 'Para FAQ e suporte simples, 3–5 mensagens é suficiente. Para consultorias longas, use 10–20.' },
        { icon: '🌡️', title: 'Temperatura', accent: '#fb923c',
          desc: <>Controla a <strong style={{color:'#e2e8f0'}}>criatividade e aleatoriedade</strong> das respostas. Disponível para GPT padrão e Gemini.</>,
          code: <><span style={{color:'#4ade80'}}>0.0–0.3</span>{' → '}<span style={{color:'#94a3b8'}}>Determinístico, respostas consistentes{'\n'}</span><span style={{color:'#fb923c'}}>0.7–1.0</span>{' → '}<span style={{color:'#94a3b8'}}>Criativo, mais variado</span></>,
          tip: 'Use valores baixos (0.1–0.4) para suporte técnico. Use valores altos (0.8–1.2) para geração criativa.' },
        { icon: '🧩', title: 'Esforço de Raciocínio', accent: '#f472b6',
          desc: <>Controla quanto o modelo <strong style={{color:'#e2e8f0'}}>"pensa" antes de responder</strong>. Disponível para modelos como o1, o3, gpt-5.</>,
          code: <><span style={{color:'#4ade80'}}>Low</span>{' → '}<span style={{color:'#94a3b8'}}>Rápido e barato{'\n'}</span><span style={{color:'#fbbf24'}}>Medium</span>{' → '}<span style={{color:'#94a3b8'}}>Equilibrado (recomendado)</span></>,
          tip: 'Use "High" apenas para tarefas complexas como análise jurídica ou código avançado.' },
    ];

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card">
                <div className="guide-modal-header">
                    <span className="guide-modal-title">📖 Guia das Configurações Gerais</span>
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
        </div>,
        document.body
    );
};

export default GeralGuideModal;
