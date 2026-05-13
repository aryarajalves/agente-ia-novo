import React from 'react';

const TesterConfig = ({
    isTesterMode,
    setIsTesterMode,
    setIsBattleMode,
    testerPersona,
    setTesterPersona,
    testerPersonas,
    customPersona,
    setCustomPersona,
    testerMessageCount,
    setTesterMessageCount,
    testerDelay,
    setTesterDelay,
    testerKnowsPrompt,
    setTesterKnowsPrompt,
    testerIsDynamic,
    setTesterIsDynamic,
    isTesterAutoRunning,
    isTesterRunning,
    toggleAutoTester,
    loading
}) => {
    return (
        <div className={`tester-config-box ${isTesterMode ? 'active' : ''}`}>
            <div className="battle-toggle" style={{ marginBottom: isTesterMode ? '12px' : '0' }}>
                <label className="toggle-switch">
                    <input type="checkbox" checked={isTesterMode} onChange={(e) => {
                        setIsTesterMode(e.target.checked);
                        if (e.target.checked) setIsBattleMode(false);
                    }} />
                    <span className="slider round" style={{ backgroundColor: isTesterMode ? '#f43f5e' : '' }}></span>
                </label>
                <span style={{ fontWeight: isTesterMode ? 'bold' : 'normal', color: isTesterMode ? '#fb7185' : 'inherit' }}>
                    🎯 Stress Test (Tester AI)
                </span>
            </div>

            {isTesterMode && (
                <div className="tester-controls fade-in">
                    <div className="control-group">
                        <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>PERSONA DO TESTADOR</label>
                        <select
                            value={testerPersona}
                            onChange={(e) => setTesterPersona(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                        >
                            {Object.entries(testerPersonas).map(([id, p]) => (
                                <option key={id} value={id}>{p.name}</option>
                            ))}
                        </select>
                        {testerPersonas[testerPersona]?.description && (
                            <p className="persona-desc fade-in">
                                {testerPersonas[testerPersona].description}
                            </p>
                        )}
                    </div>

                    {testerPersona === 'custom' && (
                        <div className="control-group" style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>PROMPT DA PERSONA CUSTOMIZADA</label>
                            <textarea
                                value={customPersona}
                                onChange={(e) => setCustomPersona(e.target.value)}
                                placeholder="Ex: Você é um médico aposentado que não tem paciência para tecnologia..."
                                className="custom-persona-input"
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <div className="control-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>Nº MENSAGENS</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={testerMessageCount}
                                onChange={(e) => setTesterMessageCount(Number(e.target.value))}
                                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(244, 63, 94, 0.2)', padding: '6px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div className="control-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem', opacity: 0.7 }}>DELAY (SEGs)</label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={testerDelay}
                                onChange={(e) => setTesterDelay(Number(e.target.value))}
                                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(244, 63, 94, 0.2)', padding: '6px', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <div className="battle-toggle sub-toggle">
                            <label className="toggle-switch">
                                <input type="checkbox" checked={testerKnowsPrompt} onChange={(e) => setTesterKnowsPrompt(e.target.checked)} />
                                <span className="slider round" style={{ backgroundColor: testerKnowsPrompt ? '#f43f5e' : '' }}></span>
                            </label>
                            <div className="toggle-text">
                                <span className="title">Modo White Box 📖</span>
                                <span className="desc">O Tester lerá o prompt do agente antes.</span>
                            </div>
                        </div>

                        <div className="battle-toggle sub-toggle">
                            <label className="toggle-switch">
                                <input type="checkbox" checked={testerIsDynamic} onChange={(e) => setTesterIsDynamic(e.target.checked)} />
                                <span className="slider round" style={{ backgroundColor: testerIsDynamic ? '#f43f5e' : '' }}></span>
                            </label>
                            <div className="toggle-text">
                                <span className="title">Modo Bipolar 🌀</span>
                                <span className="desc">O humor muda conforme a conversa.</span>
                            </div>
                        </div>
                    </div>

                    <button
                        className="start-tester-btn"
                        onClick={toggleAutoTester}
                        disabled={loading && !isTesterAutoRunning}
                    >
                        {isTesterAutoRunning ? '⏹️ Parar Teste' : (isTesterRunning ? '⏳ Pensando...' : '🚀 Iniciar Stress Test')}
                    </button>
                    <p className="tester-footer-tip">
                        A IA assumirá o papel de cliente interagindo em loop contínuo.
                    </p>
                </div>
            )}
        </div>
    );
};

export default TesterConfig;
