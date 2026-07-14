import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './PageLoadingOverlay.css';

const MIN_VISIBLE_MS = 450;

const PageLoadingOverlay = () => {
    const location = useLocation();
    const [visible, setVisible] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Evita mostrar o popup no carregamento inicial da aplicação
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- exibe o overlay a cada troca de rota e o esconde após um tempo mínimo
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
        return () => clearTimeout(timer);
    }, [location.pathname, location.search]);

    if (!visible) return null;

    return (
        <div className="page-loading-overlay">
            <div className="page-loading-box">
                <div className="page-loading-spinner"></div>
                <span className="page-loading-text">Carregando...</span>
            </div>
        </div>
    );
};

export default PageLoadingOverlay;
