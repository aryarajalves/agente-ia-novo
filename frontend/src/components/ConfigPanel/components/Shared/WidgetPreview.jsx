import React from 'react';

const WidgetPreview = ({ headerColor, chatTitle, primaryColor, welcomeMessage }) => {
    return (
        <div className="widget-preview-card">
            <div className="widget-preview-header" style={{ background: headerColor }}>
                <div className="status-dot"></div>
                <span>{chatTitle}</span>
            </div>

            <div className="widget-preview-body">
                {welcomeMessage && (
                    <div className="msg-ai">{welcomeMessage}</div>
                )}
                <div className="msg-user" style={{ background: primaryColor, boxShadow: `0 4px 12px ${primaryColor}44` }}>
                    Mensagem do usuário exemplo...
                </div>
            </div>

            <div className="widget-preview-footer">
                <div className="fake-input">Digite sua dúvida...</div>
                <div className="send-btn" style={{ background: primaryColor }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default WidgetPreview;
