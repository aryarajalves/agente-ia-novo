import React from 'react';
import { useSupport } from '../SupportContext';

const Header = () => {
    const { 
        requests, selectedIds, 
        setShowGuide, setConfigModal, setWebhookModal, setShowCopySuccess,
        publicToken
    } = useSupport();

    const handleCopyPublicLink = () => {
        const link = `${window.location.origin}/public/support/${publicToken}`;
        navigator.clipboard.writeText(link);
        // show success feedback logic
    };

    return (
        <header className="page-header">
            <div>
                <h1 className="page-title">🎧 Suporte Humano</h1>
                <p className="page-subtitle">Gerencie os transbordos e ajudas solicitadas pelos usuários.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setShowGuide(true)} className="header-btn">📖 Guia</button>
                <div className="badge-total">{requests.length} na fila</div>
            </div>
        </header>
    );
};

export default Header;
