import React, { useState } from 'react';
import { useConfig } from '../ConfigContext';
import SecurityGuideModal from './Modals/SecurityGuideModal';

const TabSeguranca = () => {
    const {
        securityForbidden, setSecurityForbidden,
        securityBlacklist, setSecurityBlacklist,
        securityDiscount, setSecurityDiscount,
        securityPii, setSecurityPii,
        securityValidatorIa, setSecurityValidatorIa,
        securityBotProtection, setSecurityBotProtection,
        securityMaxMessages, setSecurityMaxMessages,
        securityLoopCount, setSecurityLoopCount,
        securitySemanticThreshold, setSecuritySemanticThreshold,
        securityComplexity, setSecurityComplexity,
        showSecurityGuide, setShowSecurityGuide
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('guardrails');

    const subTabs = [
        { id: 'guardrails', label: '🛡️ Guardrails', desc: 'Restrições e Auditoria' },
        { id: 'bot_defense', label: '🤖 Bot Defense', desc: 'Proteção Anti-Loop' },
        { id: 'tom', label: '🗣️ Tom e Estilo', desc: 'Linguagem e Complexidade' }
    ];

    return (
        <div className="fade-in">
            {/* Header da aba com Guia e Sub-abas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`toggle-option ${activeSubTab === tab.id ? 'active' : ''}`}
                            style={{ 
                                padding: '0.5rem 1.25rem', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                background: activeSubTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: activeSubTab === tab.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--wh-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <span style={{ color: activeSubTab === tab.id ? '#fff' : 'var(--wh-text-secondary)' }}>{tab.label}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500, color: activeSubTab === tab.id ? 'rgba(255,255,255,0.8)' : 'var(--wh-text-secondary)' }}>{tab.desc}</span>
                        </button>
                    ))}
                </div>

                <button type="button" onClick={() => setShowSecurityGuide(true)} className="guide-btn security" style={{ margin: 0 }}>
                    <span>📖</span><span>Guia de Segurança</span>
                </button>
            </div>

            <SecurityGuideModal isOpen={showSecurityGuide} onClose={() => setShowSecurityGuide(false)} />

            {/* Conteúdo de Guardrails */}
            {activeSubTab === 'guardrails' && (
                <div className="form-section fade-in">
                    <span className="section-label" style={{ color: '#f43f5e', marginBottom: '1.25rem' }}>🛡️ Guardrails & Moderação</span>

                    <div className="form-group">
                        <label>🚫 Tópicos Proibidos</label>
                        <input
                            type="text"
                            placeholder="Ex: Política, Religião, Futebol, Conselhos Médicos..."
                            value={securityForbidden}
                            onChange={(e) => setSecurityForbidden(e.target.value)}
                            style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>⛔ Blacklist de Concorrentes</label>
                        <textarea
                            placeholder="Liste nomes de empresas ou produtos concorrentes..."
                            value={securityBlacklist}
                            onChange={(e) => setSecurityBlacklist(e.target.value)}
                            style={{ minHeight: '85px', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>💰 Teto e Política de Descontos</label>
                        <input
                            type="text"
                            placeholder="Ex: Máximo 10% apenas à vista."
                            value={securityDiscount}
                            onChange={(e) => setSecurityDiscount(e.target.value)}
                        />
                    </div>

                    <div className="security-toggles" style={{ marginTop: '1.5rem' }}>
                        <div className="checkbox-group pii" onClick={() => setSecurityPii(!securityPii)}>
                            <input type="checkbox" checked={securityPii} readOnly />
                            <span>Ocultar Dados Sensíveis (PII)</span>
                        </div>

                        <div className={`checkbox-group validator ${securityValidatorIa ? 'active' : ''}`} onClick={() => setSecurityValidatorIa(!securityValidatorIa)}>
                            <input type="checkbox" checked={securityValidatorIa} readOnly />
                            <div className="val-text">
                                <span className="val-title">Ativar Auditoria por IA (Double-Check)</span>
                                <span className="val-desc">Uma 2ª IA valida cada resposta antes do envio.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo de Anti-Loop */}
            {activeSubTab === 'bot_defense' && (
                <div className="form-section fade-in">
                    <span className="section-label" style={{ color: '#38bdf8', marginBottom: '1.25rem' }}>🤖 Proteção Anti-Loop (Bot Defense)</span>
                    
                    <div className={`checkbox-group bot-watch ${securityBotProtection ? 'active' : ''}`} onClick={() => setSecurityBotProtection(!securityBotProtection)} style={{ marginBottom: '1.5rem' }}>
                        <input type="checkbox" checked={securityBotProtection} readOnly />
                        <span className="watch-label">Ativar Vigilância de Sessão</span>
                    </div>

                    {securityBotProtection ? (
                        <div className="fade-in bot-params" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.5rem' }}>
                            <div className="param-grid">
                                <div className="param-item">
                                    <label>Limite de Mensagens</label>
                                    <div className="input-with-unit">
                                        <input type="number" value={securityMaxMessages} onChange={(e) => setSecurityMaxMessages(e.target.value)} />
                                        <span>msgs</span>
                                    </div>
                                </div>
                                <div className="param-item">
                                    <label>Janela de Análise</label>
                                    <div className="input-with-unit">
                                        <input type="number" min="1" max="10" value={securityLoopCount} onChange={(e) => setSecurityLoopCount(e.target.value)} />
                                        <span>olhadas</span>
                                    </div>
                                </div>
                                <div className="param-item full">
                                    <div className="slider-header">
                                        <label>Sensibilidade Semântica</label>
                                        <span className="val-badge">{Math.round(securitySemanticThreshold * 100)}%</span>
                                    </div>
                                    <div className="slider-container">
                                        <span>LEVE</span>
                                        <input type="range" min="0.5" max="0.98" step="0.01" value={securitySemanticThreshold} onChange={(e) => setSecuritySemanticThreshold(parseFloat(e.target.value))} />
                                        <span>RIGOROSA</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--wh-border)', borderRadius: '16px', color: 'var(--wh-text-secondary)', fontSize: '0.85rem' }}>
                            A proteção anti-loop impede que seu agente entre em conversas infinitas com outros bots. Ative a vigilância para configurar os limites.
                        </div>
                    )}
                </div>
            )}

            {/* Conteúdo de Tom e Linguagem */}
            {activeSubTab === 'tom' && (
                <div className="form-section fade-in">
                    <span className="section-label" style={{ marginBottom: '1.25rem' }}>🗣️ Tom e Complexidade</span>
                    <div className="form-group">
                        <label>Nível de Linguagem</label>
                        <div className="complexity-selector" style={{ marginTop: '0.5rem' }}>
                            {['simple', 'standard', 'technical'].map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    className={`toggle-option ${securityComplexity === level ? 'active' : ''}`}
                                    onClick={() => setSecurityComplexity(level)}
                                    style={{ flex: 1, padding: '0.75rem 1rem' }}
                                >
                                    <span className="toggle-icon">{level === 'simple' ? '🧒' : level === 'standard' ? '😐' : '👨‍💻'}</span>
                                    <span className="toggle-label">{level === 'simple' ? 'Simples' : level === 'standard' ? 'Padrão' : 'Técnico'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabSeguranca;
