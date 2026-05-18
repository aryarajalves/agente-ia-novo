import React, { useState, useEffect } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';

const TrainingModal = () => {
    const { 
        isTrainingModalOpen, 
        setIsTrainingModalOpen, 
        taskForTraining, 
        setTaskForTraining,
        knowledgeBases 
    } = useTranscription();

    const [selectedKbId, setSelectedKbId] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Lista de perguntas e respostas geradas
    const [qaList, setQaList] = useState([]);

    // Resetar estados quando o modal abre/fecha
    useEffect(() => {
        if (isTrainingModalOpen) {
            setSelectedKbId('');
            setNumQuestions(5);
            setQaList([]);
            setIsGenerating(false);
            setIsSaving(false);
        }
    }, [isTrainingModalOpen]);

    if (!isTrainingModalOpen || !taskForTraining) return null;

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message, type }
        }));
    };

    // Gera perguntas & respostas usando a IA
    const handleGenerate = async () => {
        if (!selectedKbId) {
            showToast('Por favor, selecione uma base de conhecimento de destino.', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post('/knowledge-bases/generate-qa-from-transcription', {
                text: taskForTraining.result_text || '',
                total_questions: Number(numQuestions)
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    // Adiciona um ID local temporário para controle de renderização e exclusão
                    const listWithIds = data.map((item, index) => ({
                        localId: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                        question: item.pergunta || item.question || '',
                        answer: item.resposta || item.answer || '',
                        category: item.categoria || item.category || 'Treinamento'
                    }));
                    setQaList(listWithIds);
                    showToast('Perguntas e respostas geradas com sucesso!');
                } else {
                    showToast('A IA não conseguiu extrair perguntas estruturadas. Tente novamente.', 'error');
                }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Falha ao conectar com o serviço de IA.', 'error');
            }
        } catch (error) {
            showToast('Erro de conexão ao gerar perguntas.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // Salva os itens editados no banco de dados da base selecionada
    const handleSave = async () => {
        if (qaList.length === 0) {
            showToast('Gere ou adicione pelo menos uma pergunta para salvar.', 'error');
            return;
        }

        // Validação rápida de campos vazios
        const hasEmpty = qaList.some(item => !item.question.trim() || !item.answer.trim());
        if (hasEmpty) {
            showToast('Preencha todas as perguntas e respostas antes de salvar.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Mapeia para o formato esperado pelo schema do backend
            const itemsToSave = qaList.map(item => ({
                question: item.question.trim(),
                answer: item.answer.trim(),
                category: item.category || 'Treinamento',
                metadata_val: `Fonte: Transcrição - ${taskForTraining.filename}`
            }));

            const response = await api.post(`/knowledge-bases/${selectedKbId}/items/add-batch`, {
                items: itemsToSave
            });

            if (response.ok) {
                showToast('Treinamento integrado à base de conhecimento com sucesso!');
                setIsTrainingModalOpen(false);
                setTaskForTraining(null);
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Erro ao salvar os itens na base de conhecimento.', 'error');
            }
        } catch (error) {
            showToast('Erro de rede ao salvar treinamento.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Atualiza um campo de pergunta ou resposta específico
    const handleFieldChange = (localId, field, value) => {
        setQaList(prev => prev.map(item => {
            if (item.localId === localId) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // Remove um card de P&R
    const handleRemoveCard = (localId) => {
        setQaList(prev => prev.filter(item => item.localId !== localId));
        showToast('Pergunta removida da lista.', 'success');
    };

    // Adiciona uma nova pergunta em branco manualmente
    const handleAddManualCard = () => {
        const newCard = {
            localId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            question: '',
            answer: '',
            category: 'Treinamento Manual'
        };
        setQaList(prev => [...prev, newCard]);
        showToast('Nova pergunta adicionada no fim.', 'success');
    };

    return (
        <div className="training-modal-overlay">
            <div className="training-modal-content">
                {/* Header */}
                <div className="training-modal-header">
                    <div className="training-header-title-wrapper">
                        <span className="training-header-icon">🧠</span>
                        <div>
                            <h2 className="training-header-title">Treinamento com IA</h2>
                            <p className="training-header-subtitle">
                                Gerando perguntas e respostas de: <strong style={{ color: '#c084fc' }}>{taskForTraining.filename}</strong>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setIsTrainingModalOpen(false);
                            setTaskForTraining(null);
                        }}
                        className="training-modal-close"
                    >
                        &times;
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="training-modal-body">
                    {qaList.length === 0 ? (
                        /* Tela de Configuração Inicial */
                        <div className="training-setup-wrapper">
                            <div className="training-info-block">
                                <p>
                                    Esta interface lerá o texto completo da transcrição da aula, identificará os conceitos didáticos principais e formulará um conjunto refinado de perguntas e respostas para treinar o seu agente inteligente de suporte.
                                </p>
                            </div>

                            {/* Dropdown de Base */}
                            <div className="training-form-group">
                                <label>
                                    Base de Conhecimento de Destino <span>*</span>
                                </label>
                                <select
                                    value={selectedKbId}
                                    onChange={(e) => setSelectedKbId(e.target.value)}
                                    className="training-select"
                                >
                                    <option value="">Selecione uma base...</option>
                                    {knowledgeBases.map(kb => (
                                        <option key={kb.id} value={kb.id}>{kb.name} ({kb.kb_type === 'qa' ? 'P&R' : 'Texto'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dropdown de Quantidade */}
                            <div className="training-form-group">
                                <label>
                                    Quantidade Máxima de Perguntas
                                </label>
                                <select
                                    value={numQuestions}
                                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                                    className="training-select"
                                >
                                    <option value={3}>3 Perguntas</option>
                                    <option value={5}>5 Perguntas (Recomendado)</option>
                                    <option value={10}>10 Perguntas</option>
                                    <option value={15}>15 Perguntas</option>
                                </select>
                            </div>

                            {/* Ação de Geração */}
                            <div className="training-btn-wrapper">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="training-btn-generate"
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="training-spinner" />
                                            Lendo Transcrição & Analisando...
                                        </>
                                    ) : (
                                        <>
                                            Gerar Perguntas & Respostas com IA 🤖
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Tela de Edição dos Itens Gerados */
                        <div className="training-edit-wrapper">
                            <div className="training-edit-header">
                                <span>
                                    Total: <strong>{qaList.length}</strong> conhecimentos estruturados
                                </span>
                                <button
                                    onClick={handleAddManualCard}
                                    className="training-btn-add-manual"
                                >
                                    ➕ Adicionar Pergunta Manual
                                </button>
                            </div>

                            {/* Cards List */}
                            <div className="training-cards-list">
                                {qaList.map((item, index) => (
                                    <div key={item.localId} className="training-card-item">
                                        {/* Card Number & Delete Button */}
                                        <div className="training-card-header">
                                            <span>
                                                #Conhecimento {index + 1}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveCard(item.localId)}
                                                title="Remover pergunta"
                                                className="training-card-remove"
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        {/* Inputs */}
                                        <div className="training-card-fields">
                                            <div className="training-card-field">
                                                <input 
                                                    type="text"
                                                    value={item.question}
                                                    placeholder="Digite a pergunta didática..."
                                                    onChange={(e) => handleFieldChange(item.localId, 'question', e.target.value)}
                                                    className="training-card-input"
                                                />
                                            </div>
                                            <div className="training-card-field">
                                                <textarea 
                                                    value={item.answer}
                                                    rows={3}
                                                    placeholder="Digite a resposta que a IA usará como referência..."
                                                    onChange={(e) => handleFieldChange(item.localId, 'answer', e.target.value)}
                                                    className="training-card-textarea"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="training-modal-footer">
                    <button 
                        onClick={() => {
                            setIsTrainingModalOpen(false);
                            setTaskForTraining(null);
                        }}
                        disabled={isSaving}
                        className="training-btn-cancel"
                    >
                        Fechar
                    </button>
                    {qaList.length > 0 && (
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="training-btn-save"
                        >
                            {isSaving ? (
                                <>
                                    <span className="training-save-spinner" />
                                    Gravando na Base...
                                </>
                            ) : (
                                <>
                                    Salvar na Base de Conhecimento 🚀
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrainingModal;
