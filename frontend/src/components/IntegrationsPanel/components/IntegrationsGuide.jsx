import React from 'react';
import { createPortal } from 'react-dom';

const IntegrationsGuide = ({ showGuide, setShowGuide }) => {
    const [activeSection, setActiveSection] = React.useState(0);

    // Gerencia a visibilidade da barra lateral externa
    // IMPORTANTE: Deve vir antes do return null para que o React registre o efeito
    React.useEffect(() => {
        if (showGuide) {
            document.body.classList.add('global-modal-open');
        } else {
            document.body.classList.remove('global-modal-open');
        }
        return () => {
            document.body.classList.remove('global-modal-open');
        };
    }, [showGuide]);

    if (!showGuide) return null;

    const cards = [
        {
            icon: '🔌', title: 'O que são Integrações Globais?', accent: '#6366f1',
            desc: 'Integrações Globais são conexões com serviços externos (como o Google Calendar) que ficam disponíveis para todos os seus agentes. Você configura uma vez aqui e pode ativar em cada agente individualmente.',
            tip: 'Diferente de Habilidades (webhooks), as integrações globais usam autenticação OAuth segura com os serviços oficiais.',
        },
        {
            icon: '📅', title: 'Google Calendar', accent: '#4285f4',
            desc: 'Conecta a conta Google da sua empresa para que os agentes possam criar eventos, consultar disponibilidade, listar compromissos e responder perguntas sobre agenda diretamente na conversa.',
            code: 'Exemplos de uso:\n• "Agende uma reunião para amanhã às 14h"\n• "Quais são meus compromissos de hoje?"\n• "Cancele o evento de sexta-feira"\n• "Verifique se estou livre na próxima semana"',
            tip: 'O agente age em nome da conta conectada. Use uma conta de serviço/empresa, não pessoal.',
        },
        {
            icon: '🔐', title: 'Como funciona a autenticação OAuth?', accent: '#8b5cf6',
            desc: 'Ao clicar em "Conectar Google Agenda", você será redirecionado para a tela de login do Google. Após autorizar, o sistema recebe um token seguro que permite operar em nome da conta — sem armazenar sua senha.',
            tip: 'O token pode ser revogado a qualquer momento nas configurações de segurança da conta Google.',
        },
        {
            icon: '⚡', title: 'Sincronizar Ferramentas no Catálogo', accent: '#10b981',
            desc: 'Após conectar, use o botão "Sincronizar Ferramentas" para registrar as ações do Google Calendar como ferramentas nativas no catálogo.',
            tip: 'O status "✓ CONECTADO" deve estar visível para sincronizar.',
        },
        {
            icon: '🤖', title: 'Ativando por Agente', accent: '#f59e0b',
            desc: 'Cada agente decide quais ferramentas usar. Após sincronizar, vá em Configurações do Agente → aba "Habilidades" e ative o calendário.',
            tip: 'Ative apenas nos agentes que realmente precisam para manter o prompt limpo.',
        },
        {
            icon: '🛠️', title: 'Configuração do .env (para admins)', accent: '#ef4444',
            desc: 'Para que o OAuth funcione, o servidor precisa das credenciais do Google Cloud configuradas no arquivo .env.',
            code: 'GOOGLE_CLIENT_ID=...\nGOOGLE_CLIENT_SECRET=...\nGOOGLE_REDIRECT_URI=...',
        },
    ];

    return createPortal(
        <div
            className="premium-modal-overlay"
            // onClick={() => setShowGuide(false)} // Removido: não fecha ao clicar fora
        >
            <div
                className="premium-modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '900px', height: '80vh' }}
            >
                <div className="modal-header-premium">
                    <div className="header-info">
                        <div className="header-icon">📖</div>
                        <div className="header-title">Guia das Integrações Globais</div>
                    </div>
                    <button onClick={() => setShowGuide(false)} className="modal-close-btn">✕</button>
                </div>

                <div className="modal-body-wrapper">
                    <div className="modal-sidebar-premium" style={{ width: '260px' }}>
                        <div className="tab-switcher-premium">
                            {cards.map((card, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveSection(i)}
                                    className={`tab-btn ${activeSection === i ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">{card.icon}</span>
                                    <span style={{ fontSize: '0.8rem' }}>{card.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-main-content" style={{ padding: '2.5rem' }}>
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '2.5rem' }}>{cards[activeSection].icon}</span>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                        {cards[activeSection].title}
                                    </h2>
                                    <div style={{ width: '40px', height: '4px', background: cards[activeSection].accent, borderRadius: '2px', marginTop: '8px' }} />
                                </div>
                            </div>

                            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
                                {cards[activeSection].desc}
                            </p>

                            {cards[activeSection].code && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', marginLeft: '4px' }}>Exemplo de Configuração</div>
                                    <pre style={{
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '16px', padding: '1.25rem',
                                        fontSize: '0.85rem', color: '#7dd3fc', overflowX: 'auto',
                                        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
                                    }}>{cards[activeSection].code}</pre>
                                </div>
                            )}

                            {cards[activeSection].tip && (
                                <div style={{ 
                                    background: `linear-gradient(135deg, ${cards[activeSection].accent}11 0%, transparent 100%)`,
                                    border: `1px solid ${cards[activeSection].accent}22`,
                                    borderRadius: '16px', padding: '1.25rem',
                                    display: 'flex', gap: '12px'
                                }}>
                                    <span style={{ fontSize: '1.25rem' }}>💡</span>
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                                        {cards[activeSection].tip}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IntegrationsGuide;
