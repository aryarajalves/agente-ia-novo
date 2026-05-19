import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import PromptEditor from '../../PromptEditor/index';
import TemporalGuideModal from './Modals/TemporalGuideModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';

const ChatwootLabelMultiSelect = ({ selected = [], options = [], onChange, accentColor = '#6366f1', placeholder = 'Buscar etiqueta...' }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const safeSelected = Array.isArray(selected) ? selected : [];
    const safeOptions = options || [];

    const filtered = safeOptions.filter(o => o && o.toLowerCase().includes(search.toLowerCase()));
    const canAddCustom = search.trim() && !safeOptions.some(o => o.toLowerCase() === search.trim().toLowerCase());

    return (
        <div ref={ref} style={{ position: 'relative', marginTop: '0.5rem' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ background: '#0f172a', border: `1px solid ${open ? accentColor + '66' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', minHeight: '42px', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', transition: 'border 0.15s' }}
            >
                {safeSelected.length === 0 ? (
                    <span style={{ color: '#475569', fontSize: '0.82rem' }}>Nenhuma etiqueta selecionada</span>
                ) : (
                    safeSelected.map(lbl => (
                        <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: accentColor + '22', border: `1px solid ${accentColor}44`, borderRadius: '20px', padding: '2px 8px 2px 10px', fontSize: '0.75rem', color: accentColor, fontWeight: 600 }}>
                            {lbl}
                            <button type="button" onClick={e => { e.stopPropagation(); onChange(safeSelected.filter(x => x !== lbl)); }}
                                style={{ background: 'none', border: 'none', color: accentColor, cursor: 'pointer', fontSize: '0.8rem', padding: 0, marginLeft: '3px' }}>✕</button>
                        </span>
                    ))
                )}
                <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.75rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#0f172a', border: `1px solid ${accentColor}44`, borderRadius: '8px', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.4rem' }}>
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={placeholder}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.45rem 0.7rem', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                        />
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {filtered.length === 0 && !canAddCustom ? (
                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>Nenhuma etiqueta encontrada</div>
                        ) : filtered.map(opt => {
                            const isSelected = safeSelected.includes(opt);
                            return (
                                <div
                                    key={opt}
                                    onClick={e => { e.stopPropagation(); onChange(isSelected ? safeSelected.filter(x => x !== opt) : [...safeSelected, opt]); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', cursor: 'pointer', background: isSelected ? accentColor + '18' : 'transparent', transition: 'background 0.1s' }}
                                >
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${isSelected ? accentColor : '#334155'}`, background: isSelected ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                                        {isSelected && <span style={{ color: '#0f172a', fontSize: '0.65rem', fontWeight: 900 }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: isSelected ? '#fff' : '#94a3b8' }}>{opt}</span>
                                </div>
                            );
                        })}
                        {canAddCustom && (
                            <div
                                onClick={e => {
                                    e.stopPropagation();
                                    const newLabel = search.trim();
                                    onChange([...safeSelected, newLabel]);
                                    setSearch('');
                                }}
                                style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', borderTop: '1px dashed rgba(255,255,255,0.08)', color: accentColor, fontSize: '0.82rem', fontWeight: 600 }}
                            >
                                ➕ Adicionar "{search.trim()}"
                            </div>
                        )}
                    </div>
                    {safeSelected.length > 0 && (
                        <div style={{ padding: '0.4rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: accentColor }}>{safeSelected.length} selecionada(s)</span>
                            <button type="button" onClick={e => { e.stopPropagation(); onChange([]); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>Limpar todas</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TabPrompts = () => {
    const {
        id, isNew, systemPrompt, setSystemPrompt,
        routerEnabled, routerComplexModel, selectedModel,
        initialMessage, setInitialMessage,
        initialQuestionMessage, setInitialQuestionMessage,
        initialIgnoreMessage, setInitialIgnoreMessage,
        qualificationQuestions, setQualificationQuestions,
        qualificationLabels, setQualificationLabels,
        dateAwareness, setDateAwareness,
        simulatedTime, setSimulatedTime,
        toolsList, selectedTools
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('initial');
    const [showTemporalGuide, setShowTemporalGuide] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, index: null, text: '' });

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
            setQualificationQuestions([...qualificationQuestions, val]);
            input.value = '';
        }
    };

    const handleRemoveQualificationQuestion = (index) => {
        setQualificationQuestions(qualificationQuestions.filter((_, i) => i !== index));
    };

    const handleMoveQuestion = (index, direction) => {
        const next = [...qualificationQuestions];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setQualificationQuestions(next);
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
                                qualificationQuestions.map((q, idx) => (
                                    <div key={idx} className="ignore-msg-item" style={{ gap: '0.5rem' }}>
                                        <span style={{
                                            minWidth: '24px', height: '24px', borderRadius: '50%',
                                            background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                                        }}>{idx + 1}</span>
                                        <div className="msg-text">{q}</div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                            <button type="button" onClick={() => handleMoveQuestion(idx, -1)} disabled={idx === 0}
                                                className="delete-btn" style={{ opacity: idx === 0 ? 0.3 : 1, fontSize: '0.75rem' }}>▲</button>
                                            <button type="button" onClick={() => handleMoveQuestion(idx, 1)} disabled={idx === qualificationQuestions.length - 1}
                                                className="delete-btn" style={{ opacity: idx === qualificationQuestions.length - 1 ? 0.3 : 1, fontSize: '0.75rem' }}>▼</button>
                                            <button type="button" onClick={() => handleRemoveQualificationQuestion(idx)} className="delete-btn">🗑️</button>
                                        </div>
                                    </div>
                                ))
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabPrompts;
