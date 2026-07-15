import React, { useState } from 'react';
import { useConfig } from '../ConfigContext';
import WhitelabelGuideModal from './Modals/WhitelabelGuideModal';
import WidgetPreview from './Shared/WidgetPreview';
import { API_URL } from '../../../config';

const TabWhitelabel = () => {
    const {
        id, initialMessage,
        uiPrimaryColor, setUiPrimaryColor,
        uiHeaderColor, setUiHeaderColor,
        uiChatTitle, setUiChatTitle,
        uiWelcomeMessage,
        showWhitelabelGuide, setShowWhitelabelGuide
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('appearance');

    const subTabs = [
        { id: 'appearance', label: '🎨 Aparência', desc: 'Cores e título do widget' },
        { id: 'install', label: '💻 Instalação', desc: 'Código para colar no seu site' },
        { id: 'preview', label: '👁️ Preview', desc: 'Como o chat vai aparecer' }
    ];

    const getSnippet = () => {
        return `<script \n  src="${API_URL}/static/widget.js" \n  data-agent-id="${id}"\n  data-title="${uiChatTitle}"\n  data-primary-color="${uiPrimaryColor}"\n  data-header-color="${uiHeaderColor}"\n  data-welcome="${initialMessage || uiWelcomeMessage}"\n></script>`;
    };

    const handleCopySnippet = () => {
        navigator.clipboard.writeText(getSnippet()).then(() => {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: '✅ Código copiado para a área de transferência!', type: 'success' }
            }));
        }).catch(() => {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: '❌ Erro ao copiar o código.', type: 'error' }
            }));
        });
    };

    return (
        <div className="fade-in">
            {/* Header da aba com Sub-abas e Guia */}
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

                <button type="button" onClick={() => setShowWhitelabelGuide(true)} className="guide-btn whitelabel" style={{ margin: 0 }}>
                    <span>📖</span><span>Guia do Whitelabel</span>
                </button>
            </div>

            <WhitelabelGuideModal isOpen={showWhitelabelGuide} onClose={() => setShowWhitelabelGuide(false)} />

            {activeSubTab === 'appearance' && (
                <div className="form-section fade-in">
                    <span className="section-label">Personalização do Chat Widget</span>
                    <div className="color-grid">
                        <div className="color-item">
                            <label className="color-field-label">Cor Primária (Botão e Balões)</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    className="color-swatch"
                                    value={uiPrimaryColor}
                                    onChange={(e) => setUiPrimaryColor(e.target.value)}
                                    title="Escolha a cor primária"
                                />
                                <input
                                    type="text"
                                    className="color-hex-input"
                                    value={uiPrimaryColor}
                                    onChange={(e) => setUiPrimaryColor(e.target.value)}
                                    placeholder="#6366f1"
                                    maxLength={7}
                                />
                            </div>
                        </div>
                        <div className="color-item">
                            <label className="color-field-label">Cor do Cabeçalho</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    className="color-swatch"
                                    value={uiHeaderColor}
                                    onChange={(e) => setUiHeaderColor(e.target.value)}
                                    title="Escolha a cor do cabeçalho"
                                />
                                <input
                                    type="text"
                                    className="color-hex-input"
                                    value={uiHeaderColor}
                                    onChange={(e) => setUiHeaderColor(e.target.value)}
                                    placeholder="#0f172a"
                                    maxLength={7}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Nome do Chat (Título)</label>
                        <input
                            type="text"
                            placeholder="Ex: IA do Atendimento"
                            value={uiChatTitle}
                            onChange={(e) => setUiChatTitle(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {activeSubTab === 'install' && (
                <div className="form-section fade-in">
                    <span className="section-label">Código de Instalação</span>
                    <div className="snippet-box">
                        <pre className="snippet-code">{getSnippet()}</pre>
                        <button
                            type="button"
                            onClick={handleCopySnippet}
                            className="copy-btn-floating"
                            title="Copiar código de instalação"
                            id="whitelabel-copy-btn"
                        >
                            📋 Copiar
                        </button>
                    </div>
                    <p className="snippet-tip">Copie e cole este código antes da tag <code>&lt;/body&gt;</code> do seu site.</p>
                </div>
            )}

            {activeSubTab === 'preview' && (
                <div className="form-section fade-in">
                    <span className="section-label">Preview em Tempo Real</span>
                    <div className="preview-container">
                        <WidgetPreview
                            headerColor={uiHeaderColor}
                            chatTitle={uiChatTitle}
                            primaryColor={uiPrimaryColor}
                            welcomeMessage={initialMessage || uiWelcomeMessage}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabWhitelabel;
