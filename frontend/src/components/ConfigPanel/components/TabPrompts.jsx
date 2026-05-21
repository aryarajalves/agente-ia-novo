import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import PromptEditor from '../../PromptEditor/index';
import TemporalGuideModal from './Modals/TemporalGuideModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import ChatwootLabelMultiSelect from './Shared/ChatwootLabelMultiSelect';


const TabPrompts = () => {
    const {
        id, isNew, systemPrompt, setSystemPrompt,
        routerEnabled, routerComplexModel, selectedModel,
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        initialIgnoreMessage, setInitialIgnoreMessage,
        qualificationQuestions, setQualificationQuestions,
        qualificationLabels, setQualificationLabels,
        qualificationCriteria, setQualificationCriteria,
        dateAwareness, setDateAwareness,
        simulatedTime, setSimulatedTime,
        toolsList, selectedTools
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('initial');
    const [showTemporalGuide, setShowTemporalGuide] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, text: '' });
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [editingInstruction, setEditingInstruction] = useState('');
    const [deleteQModal, setDeleteQModal] = useState({ isOpen: false, index: null, text: '' });

    const isLeadQualificadoActive = toolsList.some(
        t => selectedTools.includes(t.id) && t.name === 'lead_qualificado'
    );

    const [availableLabels, setAvailableLabels] = useState([]);
    const [isLoadingLabels, setIsLoadingLabels] = useState(false);

    useEffect(() => {
        const fetchLabels = async () => {
            if (isNew || !id) {
                setAvailableLabels([]);
                return;
            }
            setIsLoadingLabels(true);
            try {
                const res = await api.get(`/agents/${id}/chatwoot-labels`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Erro ao buscar labels do Chatwoot:", err);
            } finally {
                setIsLoadingLabels(false);
            }
        };

        if (isLeadQualificadoActive) {
            fetchLabels();
        }
    }, [id, isNew, isLeadQualificadoActive]);

    useEffect(() => {
        if (showTemporalGuide || deleteModal.isOpen) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showTemporalGuide, deleteModal.isOpen]);

    const handleAddQualificationQuestion = () => {
        const input = document.getElementById('new-qualification-question');
        const val = input.value.trim();
        if (val) {
            setQualificationQuestions([...qualificationQuestions, { text: val, instruction: '' }]);
            input.value = '';
        }
    };

    const handleRemoveQualificationQuestionClick = (index, text) => {
        setDeleteQModal({ isOpen: true, index, text });
    };

    const confirmDeleteQualificationQuestion = () => {
        if (deleteQModal.index !== null) {
            setQualificationQuestions(qualificationQuestions.filter((_, i) => i !== deleteQModal.index));
            setDeleteQModal({ isOpen: false, index: null, text: '' });
        }
    };

    const handleMoveQuestion = (index, direction) => {
        const next = [...qualificationQuestions];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setQualificationQuestions(next);
    };

    const handleStartEdit = (index, q) => {
        setEditingIndex(index);
        if (typeof q === 'string') {
            setEditingText(q);
            setEditingInstruction('');
        } else {
            setEditingText(q.text || '');
            setEditingInstruction(q.instruction || '');
        }
    };

    const handleSaveEdit = (index) => {
        if (!editingText.trim()) return;
        const next = [...qualificationQuestions];
        next[index] = { 
            text: editingText.trim(), 
            instruction: editingInstruction.trim() 
        };
        setQualificationQuestions(next);
        setEditingIndex(null);
        setEditingText('');
        setEditingInstruction('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingText('');
        setEditingInstruction('');
    };

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
                <DeleteMessageModal 
                    isOpen={deleteQModal.isOpen} 
                    messageText={deleteQModal.text}
                    descriptionText="Você tem certeza que deseja apagar esta pergunta qualificatória?"
                    onConfirm={confirmDeleteQualificationQuestion}
                    onCancel={() => setDeleteQModal({ isOpen: false, index: null, text: '' })}
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
                                    style={{ color: '#fff' }}
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

                {isLeadQualificadoActive && (
                    <div className="form-section" style={{ marginTop: '1.5rem' }}>
                        <span className="section-label">🎯 Lead Qualificado — Perguntas de Qualificação</span>
                        <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                            O agente enviará essas perguntas em sequência ao usuário. Quando todas forem respondidas, a ferramenta <strong>lead_qualificado</strong> será acionada.
                        </p>
                        <div className="ignore-msg-input-group">
                            <input
                                id="new-qualification-question"
                                placeholder="Ex: Qual é o seu nome completo?"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddQualificationQuestion()}
                                style={{ color: '#fff' }}
                            />
                            <button type="button" onClick={handleAddQualificationQuestion} className="add-btn">
                                <span>➕</span> Adicionar
                            </button>
                        </div>
                        <div className="ignore-msg-list" style={{ marginTop: '1rem' }}>
                            {qualificationQuestions.length === 0 ? (
                                <div className="empty-state">Nenhuma pergunta cadastrada. Adicione a primeira acima.</div>
                            ) : (
                                qualificationQuestions.map((q, idx) => {
                                    const qText = typeof q === 'string' ? q : (q.text || '');
                                    const qInstruction = typeof q === 'string' ? '' : (q.instruction || '');
                                    const isEditing = editingIndex === idx;

                                    return (
                                        <div key={idx} className="ignore-msg-item" style={{ 
                                            flexDirection: 'column', 
                                            alignItems: 'stretch', 
                                            gap: '0.5rem',
                                            padding: '0.75rem',
                                            background: isEditing ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                                            border: isEditing ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                                <span style={{
                                                    minWidth: '24px', height: '24px', borderRadius: '50%',
                                                    background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                                }}>{idx + 1}</span>
                                                
                                                {isEditing ? (
                                                    <input 
                                                        type="text" 
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        style={{ 
                                                            flex: 1, 
                                                            background: '#0f172a', 
                                                            border: '1px solid rgba(255,255,255,0.1)', 
                                                            borderRadius: '6px', 
                                                            padding: '0.4rem 0.6rem', 
                                                            color: '#fff', 
                                                            fontSize: '0.85rem' 
                                                        }}
                                                        autoFocus
                                                        placeholder="Qual a pergunta qualificatória?"
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(idx)}
                                                    />
                                                ) : (
                                                    <div 
                                                        className="msg-text" 
                                                        style={{ flex: 1, cursor: 'pointer', userSelect: 'none' }}
                                                        onClick={() => handleStartEdit(idx, q)}
                                                        title="Clique para editar pergunta e instrução"
                                                    >
                                                        {qText}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                    {isEditing ? (
                                                        <>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleSaveEdit(idx)} 
                                                                className="delete-btn" 
                                                                style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                                title="Salvar alteração"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={handleCancelEdit} 
                                                                className="delete-btn" 
                                                                style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                                title="Cancelar"
                                                            >
                                                                ✗
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button type="button" onClick={() => handleMoveQuestion(idx, -1)} disabled={idx === 0}
                                                                className="delete-btn" style={{ opacity: idx === 0 ? 0.3 : 1, fontSize: '0.75rem' }}>▲</button>
                                                            <button type="button" onClick={() => handleMoveQuestion(idx, 1)} disabled={idx === qualificationQuestions.length - 1}
                                                                className="delete-btn" style={{ opacity: idx === qualificationQuestions.length - 1 ? 0.3 : 1, fontSize: '0.75rem' }}>▼</button>
                                                            <button type="button" onClick={() => handleRemoveQualificationQuestionClick(idx, qText)} className="delete-btn">🗑️</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Accordion de instrução opcional */}
                                            {isEditing && (
                                                <div style={{ 
                                                    marginTop: '0.25rem', 
                                                    paddingLeft: '2rem', 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    gap: '0.3rem',
                                                    animation: 'fadeIn 0.2s ease'
                                                }}>
                                                    <label style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: '600' }}>
                                                        Instrução para o Agente (Opcional):
                                                    </label>
                                                    <textarea
                                                        value={editingInstruction}
                                                        onChange={(e) => setEditingInstruction(e.target.value)}
                                                        placeholder="Ex: Aceite apenas se o usuário digitar um e-mail válido contendo @. Se não, peça para digitar novamente."
                                                        style={{
                                                            background: '#0f172a',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: '6px',
                                                            padding: '0.4rem 0.6rem',
                                                            color: '#cbd5e1',
                                                            fontSize: '0.78rem',
                                                            minHeight: '50px',
                                                            resize: 'vertical'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Exibe a instrução atual se existir e não estiver editando */}
                                            {!isEditing && qInstruction && (
                                                <div style={{ 
                                                    paddingLeft: '2rem', 
                                                    fontSize: '0.78rem', 
                                                    color: '#64748b',
                                                    fontStyle: 'italic',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginTop: '-0.2rem'
                                                }}>
                                                    <span style={{ color: '#818cf8', fontWeight: 'bold' }}>↳ Instrução:</span> {qInstruction}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="form-section" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                            <span className="section-label">🏷️ Etiquetas do Chatwoot</span>
                            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                                Selecione as etiquetas do Chatwoot que serão aplicadas automaticamente na conversa do contato quando a qualificação for concluída.
                            </p>
                            {isLoadingLabels ? (
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                                    Carregando etiquetas do Chatwoot...
                                </div>
                            ) : (
                                <ChatwootLabelMultiSelect
                                    selected={qualificationLabels || []}
                                    options={availableLabels}
                                    onChange={(newLabels) => setQualificationLabels(newLabels)}
                                    accentColor="#6366f1"
                                />
                            )}
                        </div>

                        <div className="form-section" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                            <span className="section-label">🔥 Diretrizes e Critérios do Lead Scoring</span>
                            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                                Defina as regras de negócio e critérios que a IA utilizará para pontuar o lead (de 0 a 13) e classificá-lo em Quente 🔥, Morno ⚡ ou Frio ❄️ com base nas respostas dadas.
                            </p>
                            <textarea
                                placeholder="Ex: Avalie o lead com base nos seguintes critérios:
- Se ele tem orçamento maior que R$ 5.000 para investir em mentoria, atribua +5 pontos.
- Se ele quer começar imediatamente, atribua +4 pontos.
- Se ele já tentou outras soluções sem sucesso, atribua +4 pontos.
Classifique como Quente 🔥 se a pontuação for >= 9, Morno ⚡ se for de 5 a 8, e Frio ❄️ se for < 5."
                                value={qualificationCriteria || ''}
                                onChange={(e) => setQualificationCriteria(e.target.value)}
                                style={{ minHeight: '180px' }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabPrompts;
