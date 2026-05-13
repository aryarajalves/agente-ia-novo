import React from 'react';

const ContextConfig = ({
    globalVars,
    contextVars,
    setContextVars
}) => {
    return (
        <div className="context-card">
            <h4>🌍 Contexto</h4>
            <div className="context-fields-container">
                {globalVars.filter(gv => !gv.key.startsWith('PUBLIC_ACCESS_TOKEN_')).map(gv => (
                    <div key={gv.id} className="context-field-group">
                        <label className="context-label">{gv.key.toUpperCase().replace('_', ' ')}</label>
                        <input
                            className="context-input"
                            value={contextVars[gv.key] !== undefined ? contextVars[gv.key] : gv.value}
                            onChange={(e) => setContextVars({ ...contextVars, [gv.key]: e.target.value })}
                            placeholder={`Padrão: ${gv.value}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContextConfig;
