import React, { useState, useEffect } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { useTranscriptionData } from '../hooks/useTranscriptionData';
import { api } from '../../../api/client';

const TrainingModal = () => {
    const { 
        isTrainingModalOpen, 
        setIsTrainingModalOpen, 
        taskForTraining, 
        setTaskForTraining,
        knowledgeBases 
    } = useTranscription();

    const { fetchTasks } = useTranscriptionData();

    const [selectedKbId, setSelectedKbId] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
    const [models, setModels] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [method, setMethod] = useState('qa');
    const [chunkSize, setChunkSize] = useState(1200);
    const [overlapSize, setOverlapSize] = useState(150);
    const [showMetadata, setShowMetadata] = useState(false);
    const [metaVideoName, setMetaVideoName] = useState('');
    const [metaModule, setMetaModule] = useState('');
    const [metaChapter, setMetaChapter] = useState('');
    const [qaList, setQaList] = useState([]);
    const [targetKbItems, setTargetKbItems] = useState([]);
    const [usedLlmModel, setUsedLlmModel] = useState('');
    const [generationCostUsd, setGenerationCostUsd] = useState(0);
    const [generationCostBrl, setGenerationCostBrl] = useState(0);

    useEffect(() => {
        if (isTrainingModalOpen && taskForTraining) {
            setSelectedKbId('');
            setNumQuestions(5);
            setQaList([]);
            setIsGenerating(false);
            setIsSaving(false);
            setMethod('qa');
            setChunkSize(1200);
            setOverlapSize(150);
            setShowMetadata(false);
            setMetaVideoName(taskForTraining.filename || '');
            setMetaModule('');
            setMetaChapter('');
            setTargetKbItems([]);
            setUsedLlmModel('');
            setGenerationCostUsd(0);
            setGenerationCostBrl(0);

            // Busca dinamicamente os modelos ativos da API para respeitar chaves do .env e os lançamentos mais recentes
            api.get('/models')
                .then(res => res.json())
                .then(data => {
                    const fetchedModels = data.models || [];
                    setModels(fetchedModels);
                    if (fetchedModels.length > 0) {
                        const defaultModel = fetchedModels.find(m => m.id === 'gpt-5-mini' || m.id === 'gpt-4o-mini') || fetchedModels[0];
                        setSelectedModel(defaultModel.id);
                    }
                })
                .catch(err => {
                    console.error("Erro ao carregar modelos da API:", err);
                    setModels([
                        { id: 'gpt-4o-mini', real_id: 'gpt-4o-mini', provider: 'openai' },
                        { id: 'gpt-4o', real_id: 'gpt-4o', provider: 'openai' },
                        { id: 'gemini-1.5-flash', real_id: 'gemini-1.5-flash-002', provider: 'gemini' },
                        { id: 'gemini-1.5-pro', real_id: 'gemini-1.5-pro-002', provider: 'gemini' },
                        { id: 'claude-4.5-haiku', real_id: 'claude-haiku-4-5', provider: 'anthropic' }
                    ]);
                    setSelectedModel('gpt-4o-mini');
                });
        }
    }, [isTrainingModalOpen, taskForTraining]);

    // Fetch silencioso dos itens da base selecionada para detecção de duplicatas
    useEffect(() => {
        if (selectedKbId) {
            api.get(`/knowledge-bases/${selectedKbId}`)
                .then(res => res.json())
                .then(data => {
                    setTargetKbItems(data.items || []);
                })
                .catch(err => console.error("Erro ao buscar itens da base alvo:", err));
        } else {
            setTargetKbItems([]);
        }
    }, [selectedKbId]);

    if (!isTrainingModalOpen || !taskForTraining) return null;

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    };

    const buildMetadataVal = () => {
        const parts = [];
        const videoName = metaVideoName.trim() || taskForTraining.filename;
        parts.push(`Vídeo: ${videoName}`);
        if (metaModule.trim()) parts.push(`Módulo: ${metaModule.trim()}`);
        if (metaChapter.trim()) parts.push(`Capítulo: ${metaChapter.trim()}`);
        return parts.join(' | ');
    };

    const handleGenerateQA = async () => {
        if (!selectedKbId) { showToast('Selecione uma base de conhecimento de destino.', 'error'); return; }
        setIsGenerating(true);
        try {
            const response = await api.post('/knowledge-bases/generate-qa-from-transcription', {
                text: taskForTraining.result_text || '',
                total_questions: Number(numQuestions),
                model: selectedModel,
                task_id: taskForTraining.id
            });
            if (response.ok) {
                const data = await response.json();
                
                // Suporta o novo formato { items: [], model: "..." } e o fallback caso retorne lista
                const resultItems = Array.isArray(data) ? data : (data.items || []);
                const modelUsed = data.model || '';
                const costUsd = data.cost_usd || 0;
                const costBrl = data.cost_brl || 0;
                
                if (resultItems.length > 0) {
                    setUsedLlmModel(modelUsed);
                    setGenerationCostUsd(costUsd);
                    setGenerationCostBrl(costBrl);
                    setQaList(resultItems.map((item, i) => {
                        const ans = (item.resposta || item.answer || '').trim();
                        // Verifica duplicidade exata na resposta (pode ser aprimorado depois)
                        const isDup = targetKbItems.some(existing => existing.answer && existing.answer.trim() === ans);
                        
                        return {
                            localId: `qa-${Date.now()}-${i}`,
                            question: item.pergunta || item.question || '',
                            answer: ans,
                            category: item.categoria || item.category || 'Treinamento',
                            isDuplicate: isDup
                        };
                    }));
                    showToast(`${resultItems.length} perguntas e respostas geradas com sucesso!`);
                    
                    // Atualiza a tabela na tela anterior em tempo real
                    if (typeof fetchTasks === 'function') {
                        fetchTasks();
                    }
                } else { showToast('A IA não conseguiu extrair perguntas. Tente novamente.', 'error'); }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Falha ao conectar com o serviço de IA.', 'error');
            }
        } catch { showToast('Erro de conexão ao gerar perguntas.', 'error'); }
        finally { setIsGenerating(false); }
    };

    const handleGenerateChunks = async () => {
        if (!selectedKbId) { showToast('Selecione uma base de conhecimento de destino.', 'error'); return; }
        setIsGenerating(true);
        try {
            const response = await api.post('/knowledge-bases/generate-chunks-from-transcription', {
                text: taskForTraining.result_text || '',
                chunk_size: Number(chunkSize),
                overlap: Number(overlapSize)
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setUsedLlmModel(''); // chunks não usam LLM
                    setQaList(data.map((item, i) => {
                        const ans = (item.answer || '').trim();
                        const isDup = targetKbItems.some(existing => existing.answer && existing.answer.trim() === ans);
                        return {
                            localId: `chunk-${Date.now()}-${i}`,
                            question: item.question || `Trecho da Aula #${i + 1}`,
                            answer: ans,
                            category: 'Transcrição',
                            isDuplicate: isDup
                        };
                    }));
                    showToast(`${data.length} trechos gerados com sucesso!`);
                } else { showToast('Nenhum chunk gerado. O texto pode ser muito curto.', 'error'); }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Falha ao gerar trechos.', 'error');
            }
        } catch { showToast('Erro de conexão ao gerar trechos.', 'error'); }
        finally { setIsGenerating(false); }
    };

    const handleGenerate = () => method === 'qa' ? handleGenerateQA() : handleGenerateChunks();

    const handleRemoveDuplicates = () => {
        const filtered = qaList.filter(item => !item.isDuplicate);
        const removed = qaList.length - filtered.length;
        setQaList(filtered);
        showToast(`${removed} itens duplicados removidos.`);
    };

    const hasDuplicates = qaList.some(i => i.isDuplicate);

    const handleSave = async () => {
        if (qaList.length === 0) { showToast('Gere ou adicione pelo menos um item para salvar.', 'error'); return; }
        if (qaList.some(i => !i.question.trim() || !i.answer.trim())) {
            showToast('Preencha todos os campos antes de salvar.', 'error'); return;
        }
        setIsSaving(true);
        try {
            const metadataVal = buildMetadataVal();
            const response = await api.post(`/knowledge-bases/${selectedKbId}/items/add-batch`, {
                items: qaList.map(item => ({
                    question: item.question.trim(),
                    answer: item.answer.trim(),
                    category: item.category || (method === 'chunks' ? 'Transcrição' : 'Treinamento'),
                    metadata_val: metadataVal
                }))
            });
            if (response.ok) {
                showToast('Treinamento integrado à base de conhecimento com sucesso!');
                setIsTrainingModalOpen(false);
                setTaskForTraining(null);
                if (typeof fetchTasks === 'function') {
                    fetchTasks();
                }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Erro ao salvar os itens.', 'error');
            }
        } catch { showToast('Erro de rede ao salvar treinamento.', 'error'); }
        finally { setIsSaving(false); }
    };

    const handleFieldChange = (localId, field, value) =>
        setQaList(prev => prev.map(item => item.localId === localId ? { ...item, [field]: value } : item));

    const handleRemoveCard = (localId) => {
        setQaList(prev => prev.filter(item => item.localId !== localId));
        showToast('Item removido da lista.');
    };

    const handleAddManualCard = () => {
        setQaList(prev => [...prev, {
            localId: `manual-${Date.now()}`,
            question: method === 'chunks' ? `Trecho Manual #${prev.length + 1}` : '',
            answer: '',
            category: method === 'chunks' ? 'Transcrição' : 'Treinamento Manual'
        }]);
        showToast('Novo item adicionado.');
    };

    const isQaMode = method === 'qa';

    return (
        <div className="training-modal-overlay">
            <div className="training-modal-content" style={{ position: 'relative' }}>

                {/* Overlay de Loading Bloqueante */}
                {(isGenerating || isSaving) && (
                    <div className="training-loading-overlay">
                        <div className="training-loading-box">
                            <div className="training-loading-ring">
                                <div /><div /><div /><div />
                            </div>
                            <h3 className="training-loading-title">
                                {isSaving 
                                    ? '💾 Gravando na Base de Conhecimento...'
                                    : (isQaMode ? '🧠 Analisando com IA...' : '📑 Quebrando em Trechos...')
                                }
                            </h3>
                            <p className="training-loading-desc">
                                {isSaving
                                    ? 'Integrando as novas perguntas e respostas à sua base de conhecimento. Por favor, aguarde...'
                                    : (isQaMode
                                        ? 'A IA está lendo a transcrição e formulando as perguntas e respostas. Aguarde...'
                                        : 'Dividindo o texto em trechos sequenciais para a base de conhecimento...'
                                      )
                                }
                            </p>
                            <div className="training-loading-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}

                {/* Header - sem botão X, fechar apenas via footer */}
                <div className="training-modal-header">
                    <div className="training-header-title-wrapper">
                        <span className="training-header-icon">🧠</span>
                        <div>
                            <h2 className="training-header-title">Treinamento com IA</h2>
                            <p className="training-header-subtitle">
                                De: <strong style={{ color: '#c084fc' }}>{taskForTraining.filename}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="training-modal-body">
                    {qaList.length === 0 ? (
                        <div className="training-setup-wrapper">

                            {/* Abas de Método */}
                            <div className="training-method-tabs" role="tablist">
                                <button role="tab" aria-selected={isQaMode}
                                    className={`training-method-tab${isQaMode ? ' active' : ''}`}
                                    onClick={() => setMethod('qa')}>
                                    <span className="training-tab-icon">🧠</span>
                                    <div>
                                        <div className="training-tab-title">Perguntas &amp; Respostas</div>
                                        <div className="training-tab-desc">Geração automática com IA</div>
                                    </div>
                                    {isQaMode && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(168,85,247,0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>ATIVO</span>}
                                </button>
                                <button role="tab" aria-selected={!isQaMode}
                                    className={`training-method-tab${!isQaMode ? ' active' : ''}`}
                                    onClick={() => setMethod('chunks')}>
                                    <span className="training-tab-icon">📑</span>
                                    <div>
                                        <div className="training-tab-title">Transcrição Direta</div>
                                        <div className="training-tab-desc">Dividir em trechos (chunks)</div>
                                    </div>
                                    {!isQaMode && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(168,85,247,0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>ATIVO</span>}
                                </button>
                            </div>

                            {/* Info contextual */}
                            <div className="training-info-block">
                                {isQaMode
                                    ? <p>A IA lê o texto completo e formula <strong style={{ color: '#c084fc' }}>perguntas e respostas didáticas estruturadas</strong> para treinar o agente com precisão.</p>
                                    : <p>O texto é dividido em <strong style={{ color: '#60a5fa' }}>trechos sequenciais</strong> e inserido diretamente na base, preservando o conteúdo bruto da transcrição.</p>
                                }
                            </div>

                            {/* Metadados do Vídeo */}
                            <div className="training-metadata-section">
                                <button className="training-metadata-toggle" onClick={() => setShowMetadata(p => !p)} aria-expanded={showMetadata} type="button">
                                    <span>🏷️ &nbsp;Metadados do Vídeo <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.8rem' }}>(opcional)</span></span>
                                    <span className={`training-metadata-arrow${showMetadata ? ' open' : ''}`}>▾</span>
                                </button>
                                {showMetadata && (
                                    <div className="training-metadata-fields">
                                        <p className="training-metadata-hint">Os metadados são salvos junto a cada item e permitem que o agente cite a origem da resposta com precisão.</p>
                                        <div className="training-meta-grid">
                                            <div className="training-form-group">
                                                <label>Nome do Vídeo / Aula</label>
                                                <input type="text" value={metaVideoName} onChange={e => setMetaVideoName(e.target.value)} placeholder="Ex: Introdução ao Funil de Vendas" className="training-meta-input" id="meta-video-name" />
                                            </div>
                                            <div className="training-form-group">
                                                <label>Módulo do Curso</label>
                                                <input type="text" value={metaModule} onChange={e => setMetaModule(e.target.value)} placeholder="Ex: Módulo 3 - Captação" className="training-meta-input" id="meta-module" />
                                            </div>
                                            <div className="training-form-group">
                                                <label>Capítulo</label>
                                                <input type="text" value={metaChapter} onChange={e => setMetaChapter(e.target.value)} placeholder="Ex: Capítulo 2" className="training-meta-input" id="meta-chapter" />
                                            </div>
                                        </div>
                                        <div className="training-metadata-preview">
                                            <span className="training-metadata-preview-label">Metadado salvo:</span>
                                            <code className="training-metadata-preview-value">{buildMetadataVal()}</code>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Base de Conhecimento */}
                            <div className="training-form-group">
                                <label>Base de Conhecimento de Destino <span>*</span></label>
                                <select value={selectedKbId} onChange={e => setSelectedKbId(e.target.value)} className="training-select">
                                    <option value="">Selecione uma base...</option>
                                    {knowledgeBases.map(kb => (
                                        <option key={kb.id} value={kb.id}>{kb.name} ({kb.kb_type === 'qa' ? 'P&R' : 'Texto'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Opções por método */}
                            {isQaMode ? (
                                <div className="training-meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div className="training-form-group">
                                        <label>Quantidade de Perguntas</label>
                                        <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="training-select" id="num-questions-select">
                                            <option value={3}>3 Perguntas — Resumido</option>
                                            <option value={5}>5 Perguntas — Recomendado</option>
                                            <option value={10}>10 Perguntas — Detalhado</option>
                                            <option value={15}>15 Perguntas — Máximo</option>
                                        </select>
                                    </div>
                                    <div className="training-form-group">
                                        <label>Modelo de IA (Extrator)</label>
                                        <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="training-select" id="model-select">
                                            {models.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.id === 'gpt-5-mini' && 'gpt-5-mini (Recomendado - Rápido e Ultra Moderno 🚀)'}
                                                    {m.id === 'gpt-5.2' && 'gpt-5.2 (Alta Qualidade / Próxima Geração 🧠)'}
                                                    {m.id === 'gpt-5.4' && 'gpt-5.4 (Fronteira Avançado 👑)'}
                                                    {m.id === 'gpt-4o-mini' && 'gpt-4o-mini (Rápido e Econômico ⚡)'}
                                                    {m.id === 'gpt-4o' && 'gpt-4o (Alta Qualidade Estável 💎)'}
                                                    {m.id === 'gemini-3.1-flash' && 'gemini-3.1-flash (Econômico / Super Rápido ⚡)'}
                                                    {m.id === 'gemini-3.1-pro' && 'gemini-3.1-pro (Avançado / Contexto Gigante 🌌)'}
                                                    {m.id === 'gemini-1.5-flash' && 'gemini-1.5-flash (Econômico Estável 🟩)'}
                                                    {m.id === 'gemini-1.5-pro' && 'gemini-1.5-pro (Avançado Estável 🟪)'}
                                                    {m.id === 'claude-4.5-haiku' && 'claude-4.5-haiku (Preciso e Super Rápido ⚡)'}
                                                    {m.id === 'claude-4.6-sonnet' && 'claude-4.6-sonnet (Super Equilibrado / Inteligente 💎)'}
                                                    {m.id === 'claude-4.6-opus' && 'claude-4.6-opus (Raciocínio Profundo / Frontier 👑)'}
                                                    {!['gpt-5-mini', 'gpt-5.2', 'gpt-5.4', 'gpt-4o-mini', 'gpt-4o', 'gemini-3.1-flash', 'gemini-3.1-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'claude-4.5-haiku', 'claude-4.6-sonnet', 'claude-4.6-opus'].includes(m.id) && `${m.id} (${m.provider === 'openai' ? 'OpenAI' : m.provider === 'gemini' ? 'Gemini' : 'Claude'})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="training-meta-grid">
                                    <div className="training-form-group">
                                        <label>Tamanho de Cada Trecho</label>
                                        <select value={chunkSize} onChange={e => setChunkSize(Number(e.target.value))} className="training-select" id="chunk-size-select">
                                            <option value={600}>600 caracteres — Trechos Curtos</option>
                                            <option value={1200}>1200 caracteres — Recomendado</option>
                                            <option value={2000}>2000 caracteres — Trechos Longos</option>
                                            <option value={3000}>3000 caracteres — Máximo</option>
                                        </select>
                                    </div>
                                    <div className="training-form-group">
                                        <label>Tamanho da Sobreposição (Overlay)</label>
                                        <select value={overlapSize} onChange={e => setOverlapSize(Number(e.target.value))} className="training-select" id="overlap-size-select">
                                            <option value={50}>50 caracteres — Mínimo</option>
                                            <option value={150}>150 caracteres — Recomendado</option>
                                            <option value={300}>300 caracteres — Alto</option>
                                            <option value={500}>500 caracteres — Máximo</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Botão de Geração */}
                            <div className="training-btn-wrapper">
                                <button onClick={handleGenerate} disabled={isGenerating} className="training-btn-generate" id="btn-generate-training">
                                    {isGenerating ? (
                                        <><span className="training-spinner" />{isQaMode ? 'Analisando com IA...' : 'Quebrando em Trechos...'}</>
                                    ) : (
                                        isQaMode ? 'Gerar Perguntas & Respostas com IA 🤖' : 'Gerar Trechos da Transcrição 📑'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Tela de Edição */
                        <div className="training-edit-wrapper">
                            <div className="training-edit-header">
                                <div>
                                    <span>Total: <strong>{qaList.length}</strong> {isQaMode ? 'conhecimentos' : 'trechos'}</span>
                                    {(metaModule || metaChapter) && (
                                        <div className="training-edit-meta-badge">🏷️ {buildMetadataVal()}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {hasDuplicates && (
                                        <button 
                                            onClick={handleRemoveDuplicates} 
                                            className="training-btn-remove-duplicates" 
                                            id="btn-remove-duplicates" 
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#f87171',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            🗑️ Remover Duplicados
                                        </button>
                                    )}
                                    <button onClick={handleAddManualCard} className="training-btn-add-manual" id="btn-add-manual-card">
                                        ➕ {isQaMode ? 'Adicionar Manual' : 'Adicionar Trecho'}
                                    </button>
                                </div>
                            </div>

                            <div className="training-cards-list">
                                {qaList.map((item, index) => (
                                    <div key={item.localId} className="training-card-item" style={{ borderColor: item.isDuplicate ? '#ef4444' : '' }}>
                                        {item.isDuplicate && (
                                            <div style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', position: 'absolute', top: '-10px', left: '10px' }}>
                                                ⚠️ Já existe na base
                                            </div>
                                        )}
                                        <div className="training-card-header">
                                            <span>#{index + 1} — {isQaMode ? 'Conhecimento' : 'Trecho'}</span>
                                            <button onClick={() => handleRemoveCard(item.localId)} title="Remover" className="training-card-remove">🗑️</button>
                                        </div>
                                        <div className="training-card-fields">
                                            <div className="training-card-field">
                                                <span className="training-card-field-label">{isQaMode ? 'Pergunta' : 'Título'}</span>
                                                <input type="text" value={item.question}
                                                    placeholder={isQaMode ? 'Digite a pergunta didática...' : 'Título do trecho...'}
                                                    onChange={e => handleFieldChange(item.localId, 'question', e.target.value)}
                                                    className="training-card-input" />
                                            </div>
                                            <div className="training-card-field">
                                                <span className="training-card-field-label">{isQaMode ? 'Resposta' : 'Conteúdo'}</span>
                                                <textarea value={item.answer}
                                                    rows={isQaMode ? 3 : 5}
                                                    placeholder={isQaMode ? 'A resposta que a IA usará como referência...' : 'Conteúdo do trecho de transcrição...'}
                                                    onChange={e => handleFieldChange(item.localId, 'answer', e.target.value)}
                                                    className="training-card-textarea" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="training-modal-footer" style={{ justifyContent: usedLlmModel ? 'space-between' : 'flex-end' }}>
                    {usedLlmModel && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#a855f7' }}>✨</span> Gerado com <strong>{usedLlmModel}</strong>
                            {generationCostBrl > 0 && (
                                <span className="cost-pill" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    💵 Custo: R$ {generationCostBrl.toFixed(4)} (${generationCostUsd.toFixed(4)})
                                </span>
                            )}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={() => { if (!isGenerating) { setIsTrainingModalOpen(false); setTaskForTraining(null); } }}
                            disabled={isSaving || isGenerating}
                            className="training-btn-cancel"
                            title={isGenerating ? 'Aguarde a geração terminar...' : ''}
                        >Fechar</button>
                        {qaList.length > 0 && (
                            <button onClick={handleSave} disabled={isSaving || hasDuplicates} className="training-btn-save" id="btn-save-training">
                                {isSaving ? <><span className="training-save-spinner" />Gravando na Base...</> : 'Salvar na Base de Conhecimento 🚀'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingModal;
