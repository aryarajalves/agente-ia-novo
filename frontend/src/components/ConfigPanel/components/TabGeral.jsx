import React from 'react';
import { useConfig } from '../ConfigContext';
import { ModelOptions, PriceDisplay } from './Shared/ModelControls';
import GeralGuideModal from './Modals/GeralGuideModal';

const TabGeral = () => {
    const {
        name, setName,
        description, setDescription,
        selectedModel, setSelectedModel,
        fallbackModel, setFallbackModel,
        routerEnabled, setRouterEnabled,
        routerSimpleModel, setRouterSimpleModel,
        routerSimpleFallbackModel, setRouterSimpleFallbackModel,
        routerComplexModel, setRouterComplexModel,
        routerComplexFallbackModel, setRouterComplexFallbackModel,
        showGeralGuide, setShowGeralGuide,
        configRole, setConfigRole,
        models, setModelSettings,
        temperature, setTemperature,
        topP, setTopP,
        topK, setTopK,
        presencePenalty, setPresencePenalty,
        frequencyPenalty, setFrequencyPenalty,
        safetySettings, setSafetySettings,
        contextWindow, setContextWindow,
        reasoningEffort, setReasoningEffort,
        modelSettings
    } = useConfig();

    const getModelForRole = (role) => {
        switch (role) {
            case 'fallback': return fallbackModel;
            case 'router_simple': return routerSimpleModel;
            case 'router_simple_fallback': return routerSimpleFallbackModel;
            case 'router_complex': return routerComplexModel;
            case 'router_complex_fallback': return routerComplexFallbackModel;
            default: return selectedModel;
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button type="button" onClick={() => setShowGeralGuide(true)} className="guide-btn">
                    <span>📖</span><span>Guia das Configurações</span>
                </button>
            </div>

            <GeralGuideModal isOpen={showGeralGuide} onClose={() => setShowGeralGuide(false)} />

            <div className="form-section">
                <span className="section-label">Identificação</span>
                <div className="form-group">
                    <label>Nome do Agente</label>
                    <input
                        type="text"
                        placeholder="Ex: Assistente de Vendas"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Descrição (Opcional)</label>
                    <textarea
                        placeholder="Descreva o propósito deste agente..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ minHeight: '80px' }}
                    />
                </div>
            </div>

            <div className="form-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                        <span className="section-label" style={{ margin: 0 }}>
                            {routerEnabled ? '🚦 Roteamento de Modelos (Cost Router)' : 'Inteligência & Modelo'}
                        </span>
                        {routerEnabled && (
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                Economize até 90% desviando perguntas simples para modelos mais baratos.
                            </p>
                        )}
                    </div>
                    <div className="status-badge active">ATIVADO</div>
                </div>

                {!routerEnabled && (
                    <div className="fade-in">
                        <div className="form-group">
                            <label>Modelo Principal</label>
                            <select value={selectedModel || ''} onChange={(e) => setSelectedModel(e.target.value || null)}>
                                <option value="">— Nenhum —</option>
                                <ModelOptions />
                            </select>
                            <PriceDisplay modelId={selectedModel} />
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Modelo de Fallback (Contingência) <span style={{ fontSize: '0.7em', color: '#64748b' }}>(Opcional)</span></label>
                            <select value={fallbackModel || ''} onChange={(e) => setFallbackModel(e.target.value || null)}>
                                <option value="">Nenhum (Usar apenas o principal)</option>
                                <ModelOptions />
                            </select>
                            {fallbackModel && <PriceDisplay modelId={fallbackModel} />}
                        </div>
                    </div>
                )}

                {routerEnabled && (
                    <div className="router-grid fade-in">
                        <div className="router-col">
                            <div className="form-group">
                                <label style={{ color: '#6ee7b7' }}>⚡ Modelo para Perguntas Simples</label>
                                <select value={routerSimpleModel || ''} onChange={(e) => setRouterSimpleModel(e.target.value || null)}>
                                    <option value="">— Nenhum —</option>
                                    <ModelOptions />
                                </select>
                                <PriceDisplay modelId={routerSimpleModel} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#6ee7b7', fontSize: '0.75rem', opacity: 0.8 }}>🔄 Fallback (Simples)</label>
                                <select value={routerSimpleFallbackModel} onChange={(e) => setRouterSimpleFallbackModel(e.target.value)}>
                                    <option value="">Sem fallback</option>
                                    <ModelOptions />
                                </select>
                                {routerSimpleFallbackModel && <PriceDisplay modelId={routerSimpleFallbackModel} />}
                            </div>
                        </div>

                        <div className="router-col">
                            <div className="form-group">
                                <label style={{ color: '#10b981' }}>🧠 Modelo para Perguntas Complexas</label>
                                <select value={routerComplexModel || ''} onChange={(e) => setRouterComplexModel(e.target.value || null)}>
                                    <option value="">— Nenhum —</option>
                                    <ModelOptions />
                                </select>
                                <PriceDisplay modelId={routerComplexModel} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#10b981', fontSize: '0.75rem', opacity: 0.8 }}>🔄 Fallback (Complexas)</label>
                                <select value={routerComplexFallbackModel} onChange={(e) => setRouterComplexFallbackModel(e.target.value)}>
                                    <option value="">Sem fallback</option>
                                    <ModelOptions />
                                </select>
                                {routerComplexFallbackModel && <PriceDisplay modelId={routerComplexFallbackModel} />}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced Model Config */}
            <div className="advanced-config-section">
                <div className="advanced-header">
                    <span className="section-label" style={{ color: '#818cf8', fontWeight: 600, margin: 0 }}>⚙️ Configurações Avançadas do Modelo</span>
                    <div className="role-selector">
                        <label>Configurar para:</label>
                        <select
                            value={configRole}
                            onChange={(e) => {
                                const newRole = e.target.value;
                                setModelSettings(prev => ({
                                    ...prev,
                                    [configRole]: {
                                        temperature, top_p: topP, top_k: topK,
                                        presence_penalty: presencePenalty,
                                        frequency_penalty: frequencyPenalty,
                                        safety_settings: safetySettings,
                                        context_window: parseInt(contextWindow)
                                    }
                                }));
                                const roleCfg = modelSettings[newRole] || {};
                                setConfigRole(newRole);
                                setTemperature(roleCfg.temperature ?? 1.0);
                                setTopP(roleCfg.top_p ?? 1.0);
                                setTopK(roleCfg.top_k ?? 40);
                                setPresencePenalty(roleCfg.presence_penalty ?? 0.0);
                                setFrequencyPenalty(roleCfg.frequency_penalty ?? 0.0);
                                setSafetySettings(roleCfg.safety_settings ?? 'standard');
                                setContextWindow(roleCfg.context_window ?? 5);
                            }}
                        >
                            {!routerEnabled ? (
                                <>
                                    <option value="main">🎯 Modelo Principal</option>
                                    <option value="fallback">⛑️ Modelo de Fallback</option>
                                </>
                            ) : (
                                <>
                                    <option value="router_simple">⚡ Modelo Simples (Router)</option>
                                    <option value="router_simple_fallback">🛡️ Fallback Simples (Router)</option>
                                    <option value="router_complex">🧠 Modelo Complexo (Router)</option>
                                    <option value="router_complex_fallback">🪵 Fallback Complexo (Router)</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                {!getModelForRole(configRole) ? (
                    <div className="no-model-message">
                        <span>🔧</span>
                        <p>Escolha um modelo acima para configurar seus parâmetros.</p>
                    </div>
                ) : (() => {
                    const m = (getModelForRole(configRole) || '').toLowerCase();
                    const isGemini = m.startsWith('gemini');
                    const isO1Limited = /^o1-(preview|mini)/.test(m);
                    const isO1Full = /^o1(?!-(preview|mini))/.test(m) && m.startsWith('o1');
                    const isO3Plus = /^o[34]/.test(m);
                    const isGpt5 = m.startsWith('gpt-5') || m.startsWith('gpt5');
                    const isReasoningModel = isO1Limited || isO1Full || isO3Plus || isGpt5;
                    const hasReasoningEffort = isO1Full || isO3Plus || isGpt5;
                    const isStandardGPT = !isGemini && !isReasoningModel;

                    return (
                        <div className="advanced-params-grid">
                            <div className="form-group" style={{ gridColumn: isReasoningModel && !hasReasoningEffort ? 'span 2' : undefined }}>
                                <label>Janela de Contexto <span className="label-value">{contextWindow} msgs</span></label>
                                <input type="number" min="1" max="100" value={contextWindow} onChange={(e) => setContextWindow(parseInt(e.target.value))} />
                            </div>

                            {hasReasoningEffort && (
                                <div className="form-group">
                                    <label>Esforço de Raciocínio</label>
                                    <select value={reasoningEffort} onChange={(e) => setReasoningEffort(e.target.value)}>
                                        <option value="low">⚡ Low</option>
                                        <option value="medium">⚖️ Medium</option>
                                        <option value="high">🧠 High</option>
                                        {isGpt5 && <option value="xhigh">🚀 xHigh</option>}
                                    </select>
                                </div>
                            )}

                            {!isReasoningModel && (
                                <div className="form-group">
                                    <label>Temperatura <span className="label-value">{temperature.toFixed(1)}</span></label>
                                    <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
                                </div>
                            )}

                            {!isReasoningModel && (
                                <div className="form-group" style={{ gridColumn: !isGemini ? 'span 2' : undefined }}>
                                    <label>Top-P <span className="label-value">{topP.toFixed(2)}</span></label>
                                    <input type="range" min="0" max="1" step="0.01" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} />
                                </div>
                            )}

                            {isGemini && (
                                <div className="form-group">
                                    <label>Top-K <span className="label-value">{topK}</span></label>
                                    <input type="range" min="1" max="100" step="1" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} />
                                </div>
                            )}

                            {isStandardGPT && (
                                <div className="form-group">
                                    <label>Presence Penalty <span className="label-value">{presencePenalty.toFixed(2)}</span></label>
                                    <input type="range" min="-2" max="2" step="0.1" value={presencePenalty} onChange={(e) => setPresencePenalty(parseFloat(e.target.value))} />
                                </div>
                            )}

                            {isStandardGPT && (
                                <div className="form-group">
                                    <label>Frequency Penalty <span className="label-value">{frequencyPenalty.toFixed(2)}</span></label>
                                    <input type="range" min="-2" max="2" step="0.1" value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))} />
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default TabGeral;
