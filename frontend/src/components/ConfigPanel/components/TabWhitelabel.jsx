import React from 'react';
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button type="button" onClick={() => setShowWhitelabelGuide(true)} className="guide-btn whitelabel">
                    <span>📖</span><span>Guia do Whitelabel</span>
                </button>
            </div>

            <WhitelabelGuideModal isOpen={showWhitelabelGuide} onClose={() => setShowWhitelabelGuide(false)} />

            <div className="form-section">
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

            <div className="form-section">
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

            <div className="form-section">
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
        </div>
    );
};

export default TabWhitelabel;
