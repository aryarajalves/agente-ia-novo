import React from 'react';

const HotfixPanel = ({ 
    show, 
    setShow, 
    title, 
    value, 
    onChange, 
    placeholder, 
    tip, 
    isChallenger = false 
}) => {
    if (!show) return null;

    return (
        <div className={`hotfix-panel ${isChallenger ? 'challenger-hotfix' : ''} fade-in`}>
            <div className="hotfix-header">
                <h4>{title}</h4>
                <button onClick={() => setShow(false)}>✖</button>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {tip && (
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px' }}>
                    💡 {tip}
                </div>
            )}
        </div>
    );
};

export default HotfixPanel;
