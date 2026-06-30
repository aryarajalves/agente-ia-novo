import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import PromptEditor from '../../PromptEditor/index';
import TemporalGuideModal from './Modals/TemporalGuideModal';
import TemporalConfigGuideModal from './Modals/TemporalConfigGuideModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import QualificationSection from './QualificationSection';

const TabPrompts = () => {
    const {
        id, isNew, systemPrompt, setSystemPrompt,
        dynamicPrompt, setDynamicPrompt,
        routerEnabled, routerComplexModel, selectedModel,
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        initialIgnoreMessage, setInitialIgnoreMessage,
        dateAwareness, setDateAwareness,
        dateAwarenessPastDays, setDateAwarenessPastDays,
        dateAwarenessFutureDays, setDateAwarenessFutureDays,
        simulatedTime, setSimulatedTime,
        toolsList, selectedTools,
        greetingMode, setGreetingMode,
        questionMode, setQuestionMode,
        adMode, setAdMode
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('post_question');
    const [showTemporalGuide, setShowTemporalGuide] = useState(false);
    const [showTemporalConfigGuide, setShowTemporalConfigGuide] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, text: '' });

    useEffect(() => {
        if (showTemporalGuide || showTemporalConfigGuide || deleteModal.isOpen) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showTemporalGuide, showTemporalConfigGuide, deleteModal.isOpen]);

    const handleAddIgnoreMsg = () => {
        const input = document.getElementById('new-ignore-msg');
        const val = input ? input.value.trim() : '';
        if (val) {
            setInitialIgnoreMessage([...initialIgnoreMessage, val]);
            input.value = '';
        }
    };

    const confirmDelete = () => {
        if (deleteModal.index !== null) {
            setInitialIgnoreMessage(initialIgnoreMessage.filter((_, i) => i !== deleteModal.index));
            setDeleteModal({ isOpen: false, index: null, text: '' });
        }
    };

    return (
        <div className="fade-in">
            <div className="form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <span className="section-label" style={{ margin: 0 }}>Editor Prompt & Regras</span>
                    <button type="button" onClick={() => setShowTemporalGuide(true)} className="guide-btn">
                        <span>📖</span><span>Guia do Prompt</span>
                    </button>
                </div>

                <TemporalGuideModal isOpen={showTemporalGuide} onClose={() => setShowTemporalGuide(false)} />
                <TemporalConfigGuideModal isOpen={showTemporalConfigGuide} onClose={() => setShowTemporalConfigGuide(false)} />
                <DeleteMessageModal 
                    isOpen={deleteModal.isOpen} 
                    messageText={deleteModal.text}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, index: null, text: '' })}
                />


                <div className="temporal-config-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="checkbox-group" onClick={() => setDateAwareness(!dateAwareness)} style={{ margin: 0 }}>
                                <input type="checkbox" checked={dateAwareness} readOnly />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>🕒 Ativar Consciência Temporal</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowTemporalConfigGuide(true); }}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    color: '#818cf8',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                                title="Saiba mais sobre a Consciência Temporal"
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                            >
                                ❓
                            </button>
                        </div>
                        {dateAwareness && (
                            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Dias Anteriores</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="60"
                                        value={dateAwarenessPastDays} 
                                        onChange={(e) => setDateAwarenessPastDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                        className="time-input" 
                                        style={{ width: '80px', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Dias Posteriores</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="60"
                                        value={dateAwarenessFutureDays} 
                                        onChange={(e) => setDateAwarenessFutureDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                        className="time-input" 
                                        style={{ width: '80px', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Forçar Horário Específico (Opcional)</label>
                                    <input type="time" value={simulatedTime} onChange={(e) => setSimulatedTime(e.target.value)} className="time-input" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <PromptEditor
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    dynamicValue={dynamicPrompt}
                    onChangeDynamic={(e) => setDynamicPrompt(e.target.value)}
                    agentId={id}
                    mainModel={routerEnabled ? routerComplexModel : selectedModel}
                    initialMessage={initialMessage}
                    initialQuestionMessage={initialQuestionMessage}
                    onChangeInitialMessage={(val) => setInitialMessage(val)}
                    availableTools={toolsList
                        .filter(t => selectedTools.includes(t.id))
                        .map(t => t.name)
                    }
                />



                <QualificationSection />
            </div>
        </div>
    );
};

export default TabPrompts;
