import React from 'react';
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

    return (
        <div className="fade-in">
            <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <span className="section-label" style={{ color: '#f43f5e', margin: 0 }}>🛡️ Guardrails & Moderação</span>
                    <button type="button" onClick={() => setShowSecurityGuide(true)} className="guide-btn security">
                        <span>📖</span><span>Guia de Segurança</span>
                    </button>
                </div>

                <SecurityGuideModal isOpen={showSecurityGuide} onClose={() => setShowSecurityGuide(false)} />

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
                        style={{ minHeight: '60px', borderColor: 'rgba(244, 63, 94, 0.3)' }}
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

                <div className="security-toggles">
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

                {/* Anti-Loop Protection */}
                <div className="anti-loop-section">
                    <label className="section-title">🛡️ Proteção Anti-Loop (Bot Defense)</label>
                    <div className={`checkbox-group bot-watch ${securityBotProtection ? 'active' : ''}`} onClick={() => setSecurityBotProtection(!securityBotProtection)}>
                        <input type="checkbox" checked={securityBotProtection} readOnly />
                        <span className="watch-label">Ativar Vigilância de Sessão</span>
                    </div>

                    {securityBotProtection && (
                        <div className="fade-in bot-params">
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
                    )}
                </div>
            </div>

            <div className="form-section">
                <span className="section-label">🗣️ Tom e Complexidade</span>
                <div className="form-group">
                    <label>Nível de Linguagem</label>
                    <div className="complexity-selector">
                        {['simple', 'standard', 'technical'].map(level => (
                            <button
                                key={level}
                                type="button"
                                className={`toggle-option ${securityComplexity === level ? 'active' : ''}`}
                                onClick={() => setSecurityComplexity(level)}
                            >
                                <span className="toggle-icon">{level === 'simple' ? '🧒' : level === 'standard' ? '😐' : '👨‍💻'}</span>
                                <span className="toggle-label">{level === 'simple' ? 'Simples' : level === 'standard' ? 'Padrão' : 'Técnico'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabSeguranca;
