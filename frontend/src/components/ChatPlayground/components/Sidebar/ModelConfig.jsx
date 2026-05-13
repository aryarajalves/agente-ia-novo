import React from 'react';

const ModelConfig = ({
    mainModelOverride,
    setMainModelOverride,
    availableModels,
    isBattleMode,
    challengerModelOverride,
    setChallengerModelOverride
}) => {
    return (
        <>
            <div className="control-group">
                <label>🤖 Modelo Principal</label>
                <select value={mainModelOverride} onChange={(e) => setMainModelOverride(e.target.value)}>
                    <option value="">(Usar Padrão do Agente)</option>
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {isBattleMode && (
                <div className="arena-challenger-config fade-in">
                    <div className="control-group">
                        <label>🧠 Modelo do Desafiante (Arena)</label>
                        <select value={challengerModelOverride} onChange={(e) => setChallengerModelOverride(e.target.value)}>
                            <option value="">(Usar Padrão do Agente)</option>
                            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModelConfig;
