import React, { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext';
import PromptEditor from '../../PromptEditor/index';
import TemporalGuideModal from './Modals/TemporalGuideModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';

const TabPrompts = () => {
    const {
        id, systemPrompt, setSystemPrompt,
        routerEnabled, routerComplexModel, selectedModel,
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        initialIgnoreMessage, setInitialIgnoreMessage,
        dateAwareness, setDateAwareness,
        simulatedTime, setSimulatedTime,
        toolsList, selectedTools
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('initial');
    const [showTemporalGuide, setShowTemporalGuide] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, text: '' });

    useEffect(() => {
        if (showTemporalGuide || deleteModal.isOpen) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showTemporalGuide, deleteModal.isOpen]);

    const handleAddIgnoreMsg = () => {
        const input = document.getElementById('new-ignore-msg');
        const val = input.value.trim();
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
                <DeleteMessageModal 
                    isOpen={deleteModal.isOpen} 
                    messageText={deleteModal.text}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, index: null, text: '' })}
                />

                <div className="temporal-config-box">
                    <div className="checkbox-group" onClick={() => setDateAwareness(!dateAwareness)}>
                        <input type="checkbox" checked={dateAwareness} readOnly />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>🕒 Ativar Consciência Temporal</span>
                    </div>
                    {dateAwareness && (
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>Forçar Horário Específico (Opcional)</label>
                            <input type="time" value={simulatedTime} onChange={(e) => setSimulatedTime(e.target.value)} className="time-input" />
                        </div>
                    )}
                </div>

                <PromptEditor
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
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

                <div className="prompt-subtabs">
                    <div className="subtab-nav">
                        <button type="button" onClick={() => setActiveSubTab('initial')} className={activeSubTab === 'initial' ? 'active' : ''}>👋 Saudação (Oi)</button>
                        <button type="button" onClick={() => setActiveSubTab('post_question')} className={activeSubTab === 'post_question' ? 'active' : ''}>❓ Se iniciar com Pergunta</button>
                        <button type="button" onClick={() => setActiveSubTab('ignore')} className={activeSubTab === 'ignore' ? 'active' : ''}>📢 Mensagem de Anúncio</button>
                    </div>
                    
                    {activeSubTab === 'initial' && (
                        <div className="fade-in subtab-pane">
                            <label>Mensagem Inicial (Para quando o usuário envia apenas um 'Oi')</label>
                            <textarea
                                placeholder="Ex: Olá! Eu sou o assistente virtual da [Sua Empresa]. Como posso te ajudar hoje?"
                                value={initialMessage}
                                onChange={(e) => setInitialMessage(e.target.value)}
                                style={{ minHeight: '140px' }}
                            />
                            <p className="subtab-tip">Enviada quando o sistema detecta apenas uma saudação (Ex: "Oi", "Bom dia").</p>
                        </div>
                    )}

                    {activeSubTab === 'post_question' && (
                        <div className="fade-in subtab-pane">
                            <label>Mensagem Inicial (Para quando o usuário já começa com uma dúvida)</label>
                            <textarea
                                placeholder="Ex: Espero ter ajudado! Além disso, eu sou o assistente da [Empresa]. Como posso te ajudar mais?"
                                value={initialQuestionMessage}
                                onChange={(e) => setInitialQuestionMessage(e.target.value)}
                                style={{ minHeight: '140px' }}
                            />
                            <p className="subtab-tip">Esta mensagem será enviada logo após a resposta da IA no primeiro contato.</p>
                        </div>
                    )}

                    {activeSubTab === 'ignore' && (
                        <div className="fade-in subtab-pane">
                            <label>Mensagens de Anúncio (Ignorar como Pergunta)</label>
                            <div className="ignore-msg-input-group">
                                <input 
                                    id="new-ignore-msg"
                                    placeholder="Digite ou cole aqui o texto do anúncio..."
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddIgnoreMsg()}
                                />
                                <button type="button" onClick={handleAddIgnoreMsg} className="add-btn">
                                    <span>➕</span> Adicionar
                                </button>
                            </div>
                            <div className="ignore-msg-list">
                                {initialIgnoreMessage.length === 0 ? (
                                    <div className="empty-state">Nenhuma mensagem de anúncio cadastrada.</div>
                                ) : (
                                    initialIgnoreMessage.map((msg, idx) => (
                                        <div key={idx} className="ignore-msg-item">
                                            <div className="msg-text">{msg}</div>
                                            <button 
                                                type="button" 
                                                onClick={() => setDeleteModal({ isOpen: true, index: idx, text: msg })} 
                                                className="delete-btn"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="subtab-tip">Se o usuário enviar qualquer um destes textos exatos, a IA entenderá apenas como uma saudação.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TabPrompts;
