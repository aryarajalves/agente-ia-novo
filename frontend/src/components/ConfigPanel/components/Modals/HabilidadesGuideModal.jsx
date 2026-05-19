import React from 'react';
import ReactDOM from 'react-dom';

const HabilidadesGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        {
            icon: '📚', title: 'Base de Conhecimento (RAG)', accent: '#4ade80',
            desc: <>Vincula documentos ao agente. Ao receber uma pergunta, o sistema busca automaticamente os trechos mais relevantes nesses documentos e os injeta no contexto antes de responder.</>,
            code: <><span style={{color:'#475569'}}>{'// Exemplo de uso:'}</span>{'\n'}<span style={{color:'#94a3b8'}}>Usuário: "Qual o prazo de entrega?"</span>{'\n'}<span style={{color:'#4ade80'}}>Sistema busca na base → encontra a política de entrega → injeta no contexto</span>{'\n'}<span style={{color:'#94a3b8'}}>Agente responde com a informação correta do documento</span></>,
            tip: 'Ideal para FAQs, manuais, catálogos e políticas da empresa. Vincule múltiplas bases para cobrir mais temas.'
        },
        {
            icon: '🎚️', title: 'Número de Respostas (RAG Limit)', accent: '#60a5fa',
            desc: <>Define quantos trechos de documentos são recuperados por busca. Mais trechos = mais contexto disponível, porém mais tokens consumidos por mensagem.</>,
            code: <><span style={{color:'#60a5fa'}}>Limite = 3</span>{' → '}<span style={{color:'#94a3b8'}}>Rápido, econômico, suficiente para perguntas simples{'\n'}</span><span style={{color:'#a78bfa'}}>Limite = 10</span>{' → '}<span style={{color:'#94a3b8'}}>Mais abrangente, recomendado para perguntas complexas</span></>,
            tip: 'Comece com 5. Aumente se o agente estiver perdendo informações importantes; diminua se o custo estiver alto.'
        },
        {
            icon: '🌍', title: 'Tradução Automática de Busca', accent: '#34d399',
            desc: <>Traduz a pergunta do usuário para o idioma em que a base de conhecimento foi escrita antes de fazer a busca. Garante resultados mesmo quando o usuário escreve em outro idioma.</>,
            code: <><span style={{color:'#94a3b8'}}>Usuário escreve em inglês: "What is the return policy?"{'\n'}</span><span style={{color:'#34d399'}}>Sistema traduz para português → busca na base → responde no idioma do usuário</span></>,
            tip: 'Ative se você atende clientes internacionais ou se sua base está em um idioma diferente do atendimento.'
        },
        {
            icon: '🔀', title: 'Busca Multi-Variável (Multi-Query)', accent: '#f59e0b',
            desc: <>Gera automaticamente diferentes versões da mesma pergunta para ampliar os resultados. Reduz o risco de não encontrar a resposta por causa de uma formulação específica.</>,
            code: <><span style={{color:'#475569'}}>{'// Pergunta original:'}</span>{' '}<span style={{color:'#94a3b8'}}>"Como cancelo meu plano?"{'\n'}</span><span style={{color:'#f59e0b'}}>Multi-Query gera também:</span>{'\n'}<span style={{color:'#94a3b8'}}>"cancelamento de assinatura" | "encerrar contrato" | "desativar plano"</span></>,
            tip: 'Recomendado para bases grandes. Aumenta a cobertura sem precisar reformular o prompt.'
        },
        {
            icon: '🎯', title: 'Re-Rankeador Semântico (LLM Reranking)', accent: '#c084fc',
            desc: <>Após buscar os trechos, usa IA para ordenar os resultados por relevância real para a pergunta. Elimina trechos que aparecem na busca mas não respondem de fato ao usuário.</>,
            code: <><span style={{color:'#475569'}}>{'// Sem reranking: retorna os 5 mais similares semanticamente'}</span>{'\n'}<span style={{color:'#c084fc'}}>{'// Com reranking: IA avalia e reordena por utilidade real para a pergunta'}</span></>,
            tip: 'Melhora muito a qualidade das respostas. Tem um custo adicional de tokens (uma chamada extra de IA).'
        },
        {
            icon: '📖', title: 'Expansão de Contexto Pai', accent: '#fb923c',
            desc: <>Ao encontrar um trecho relevante, inclui automaticamente o contexto completo do documento de origem (parágrafos vizinhos). Evita respostas incompletas por conta de trechos cortados.</>,
            code: <><span style={{color:'#475569'}}>{'// Sem expansão: retorna apenas o trecho exato encontrado'}</span>{'\n'}<span style={{color:'#fb923c'}}>{'// Com expansão: retorna o trecho + parágrafos ao redor para dar contexto completo'}</span></>,
            tip: 'Ative quando o agente estiver dando respostas que parecem "pela metade" ou sem contexto suficiente.'
        },
        {
            icon: '🛑', title: 'Avaliador Agêntico (Self-Correction)', accent: '#f87171',
            desc: <>Antes de responder, a IA avalia se os trechos recuperados são realmente relevantes para a pergunta. Descarta automaticamente resultados que não servem, evitando respostas inventadas.</>,
            code: <><span style={{color:'#4ade80'}}>Trechos relevantes</span>{' → '}<span style={{color:'#94a3b8'}}>Agente usa para responder{'\n'}</span><span style={{color:'#f87171'}}>Trechos irrelevantes</span>{' → '}<span style={{color:'#94a3b8'}}>Descartados → Agente assume que não sabe</span></>,
            tip: 'Reduz alucinações (respostas inventadas). Recomendado para casos onde precisão é mais importante que velocidade.'
        },
        {
            icon: '🛠️', title: 'Ações & Ferramentas (API / Webhooks)', accent: '#818cf8',
            desc: <>Conecta o agente a sistemas externos como CRM, ERP, agendamentos ou qualquer API. O modelo decide sozinho quando acionar cada ferramenta com base na conversa.</>,
            code: <><span style={{color:'#475569'}}>{'// Ferramentas Nativas (ex: Google Agenda):'}</span>{'\n'}<span style={{color:'#818cf8'}}>📅 Agente verifica disponibilidade e agenda horários automaticamente{'\n'}</span><span style={{color:'#475569'}}>{'// Ferramentas Externas (Webhooks):'}</span>{'\n'}<span style={{color:'#818cf8'}}>🔗 Agente chama sua API e usa a resposta para continuar o atendimento</span></>,
            tip: 'Configure as ferramentas em "Webhooks" no menu lateral. Depois vincule aqui para o agente ter acesso.'
        },
    ];

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card">
                <div className="guide-modal-header">
                    <span className="guide-modal-title">⚡ Guia das Habilidades</span>
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

export default HabilidadesGuideModal;
