import React from 'react';
import ReactDOM from 'react-dom';

const SecurityGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const items = [
        {
            icon: '🚫', title: 'Tópicos Proibidos', accent: '#f87171',
            desc: <>Lista de assuntos que o agente deve <strong style={{color:'#e2e8f0'}}>recusar completamente</strong>. Quando o usuário mencionar qualquer um desses temas, o agente desvia o assunto educadamente e se recusa a continuar.</>,
            code: <><span style={{color:'#475569'}}>{'// Exemplos de tópicos para bloquear:'}</span>{'\n'}<span style={{color:'#f87171'}}>Política, Religião, Conselhos Médicos, Futebol, Concorrentes</span>{'\n'}<span style={{color:'#94a3b8'}}>Usuário: "O que você acha de política?"{'\n'}Agente: "Não posso comentar sobre esse assunto. Posso te ajudar com outra coisa?"</span></>,
            tip: 'Separe os tópicos por vírgula. Seja específico: "conselhos jurídicos" é mais preciso do que "direito".'
        },
        {
            icon: '⛔', title: 'Blacklist de Concorrentes', accent: '#fb923c',
            desc: <>Lista de empresas ou produtos concorrentes que o agente <strong style={{color:'#e2e8f0'}}>nunca deve mencionar ou recomendar</strong>. Se o usuário perguntar sobre algum concorrente, o agente redireciona para os seus produtos.</>,
            code: <><span style={{color:'#475569'}}>{'// Adicione um por linha ou separados por vírgula:'}</span>{'\n'}<span style={{color:'#fb923c'}}>Empresa X, Produto Y, Serviço Z</span>{'\n'}<span style={{color:'#94a3b8'}}>Usuário: "Vocês são melhores que a Empresa X?"{'\n'}Agente: evita a comparação e foca nos seus diferenciais</span></>,
            tip: 'Inclua variações de nome (siglas, apelidos) para garantir cobertura total.'
        },
        {
            icon: '💰', title: 'Teto e Política de Descontos', accent: '#fbbf24',
            desc: <>Define as <strong style={{color:'#e2e8f0'}}>regras de desconto</strong> que o agente pode oferecer. Evita que o agente prometa descontos além do permitido ou sem as condições corretas.</>,
            code: <><span style={{color:'#475569'}}>{'// Exemplos de política:'}</span>{'\n'}<span style={{color:'#fbbf24'}}>Máximo 10% apenas em pagamento à vista</span>{'\n'}<span style={{color:'#fbbf24'}}>Descontos acima de 5% precisam de aprovação do gerente</span>{'\n'}<span style={{color:'#94a3b8'}}>O agente só oferece o que estiver descrito aqui</span></>,
            tip: 'Se não há política de desconto, escreva "Não oferecer descontos" para o agente nunca prometer.'
        },
        {
            icon: '🔒', title: 'Ocultar Dados Sensíveis (PII)', accent: '#4ade80',
            desc: <>Filtra automaticamente <strong style={{color:'#e2e8f0'}}>dados pessoais</strong> das respostas do agente antes de chegarem ao usuário. Protege informações como CPF, e-mail, telefone e outros dados sensíveis.</>,
            code: <><span style={{color:'#475569'}}>{'// Dados filtrados automaticamente:'}</span>{'\n'}<span style={{color:'#f87171'}}>CPF: 123.456.789-00</span>{' → '}<span style={{color:'#4ade80'}}>CPF: ***.***.***-**{'\n'}</span><span style={{color:'#f87171'}}>Email: usuario@email.com</span>{' → '}<span style={{color:'#4ade80'}}>Email: u***@***.com{'\n'}</span><span style={{color:'#f87171'}}>Telefone: (11) 99999-9999</span>{' → '}<span style={{color:'#4ade80'}}>Telefone: (**) *****-****</span></>,
            tip: 'Ative sempre em ambientes que lidam com dados de clientes para garantir conformidade com a LGPD.'
        },
        {
            icon: '🔍', title: 'Auditoria por IA (Double-Check)', accent: '#818cf8',
            desc: <>Uma <strong style={{color:'#e2e8f0'}}>segunda IA independente</strong> revisa cada resposta antes do envio. Se a resposta violar alguma regra de segurança, ela é bloqueada e reescrita automaticamente.</>,
            code: <><span style={{color:'#475569'}}>{'// Fluxo com Double-Check ativo:'}</span>{'\n'}<span style={{color:'#94a3b8'}}>1. Agente gera a resposta{'\n'}2. IA auditora verifica: viola tópico proibido? tem dado sensível? foge do escopo?{'\n'}</span><span style={{color:'#4ade80'}}>3a. Aprovada → enviada ao usuário{'\n'}</span><span style={{color:'#f87171'}}>3b. Reprovada → reescrita ou bloqueada</span></>,
            tip: 'Aumenta a segurança mas adiciona latência e custo de tokens. Use em fluxos críticos como jurídico ou financeiro.'
        },
        {
            icon: '🛡️', title: 'Proteção Anti-Loop (Bot Defense)', accent: '#a78bfa',
            desc: <>Detecta comportamento suspeito de bots ou usuários mal-intencionados que enviam mensagens repetidas para tentar confundir o agente. Quando detectado, bloqueia automaticamente a sessão.</>,
            code: <><span style={{color:'#475569'}}>{'// Parâmetros configuráveis:'}</span>{'\n'}<span style={{color:'#a78bfa'}}>Limite de mensagens</span>{' → '}<span style={{color:'#94a3b8'}}>máx. de msgs por sessão antes de bloquear{'\n'}</span><span style={{color:'#a78bfa'}}>Janela de análise</span>{' → '}<span style={{color:'#94a3b8'}}>quantas msgs passadas são analisadas{'\n'}</span><span style={{color:'#a78bfa'}}>Sensibilidade semântica</span>{' → '}<span style={{color:'#94a3b8'}}>quão parecidas as msgs precisam ser para acionar o bloqueio</span></>,
            tip: 'Sensibilidade alta (90%+) só bloqueia mensagens quase idênticas. Sensibilidade baixa (50%) bloqueia variações similares.'
        },
        {
            icon: '🗣️', title: 'Nível de Linguagem', accent: '#38bdf8',
            desc: <>Define o <strong style={{color:'#e2e8f0'}}>tom e complexidade</strong> das respostas do agente, adaptando o vocabulário e a estrutura ao perfil do público-alvo.</>,
            code: <><span style={{color:'#4ade80'}}>🧒 Simples</span>{' → '}<span style={{color:'#94a3b8'}}>Frases curtas, palavras do dia a dia, sem jargão{'\n'}</span><span style={{color:'#38bdf8'}}>😐 Padrão</span>{' → '}<span style={{color:'#94a3b8'}}>Equilibrado, adequado para a maioria dos atendimentos{'\n'}</span><span style={{color:'#a78bfa'}}>👨‍💻 Técnico</span>{' → '}<span style={{color:'#94a3b8'}}>Vocabulário especializado, detalhes técnicos, para profissionais da área</span></>,
            tip: 'Use "Simples" para varejo e suporte geral. "Técnico" para B2B, SaaS ou atendimentos especializados.'
        },
    ];

    return ReactDOM.createPortal(
        <div className="guide-modal-overlay">
            <div className="guide-modal-card">
                <div className="guide-modal-header">
                    <span className="guide-modal-title">🛡️ Guia de Segurança</span>
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

export default SecurityGuideModal;
