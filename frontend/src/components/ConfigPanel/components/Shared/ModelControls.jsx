import React from 'react';
import { useConfig } from '../../ConfigContext';

export const ModelOptions = () => {
    const { models, openaiConnected, geminiConnected, anthropicConnected } = useConfig();

    const geminiModels = models.filter(m => m.id.toLowerCase().includes('gemini'));
    const anthropicModels = models.filter(m => m.id.toLowerCase().includes('claude'));
    const openaiModels = models.filter(m => !m.id.toLowerCase().includes('gemini') && !m.id.toLowerCase().includes('claude') && !m.is_finetuned);
    const tunedModels = models.filter(m => m.is_finetuned);

    return (
        <>
            {geminiModels.length > 0 && (
                <optgroup label={`GOOGLE GEMINI ♊ (Até 2M de Contexto) ${!geminiConnected ? '⚠️ NÃO CONECTADO' : ''}`}>
                    {geminiModels.filter(m => geminiConnected || m.is_finetuned).map(m => (
                        <option key={m.id} value={m.id} title={`API: ${m.real_id || m.id}`}>
                            ♊ {m.id} [{m.context_window || '1M'}] {m.supports_tools ? '🛠️' : ''} {m.supports_temperature ? '🔥' : ''}
                        </option>
                    ))}
                    {!geminiConnected && <option disabled>⚠️ Configure GEMINI_API_KEY no .env</option>}
                </optgroup>
            )}
            {anthropicModels.length > 0 && (
                <optgroup label={`ANTHROPIC CLAUDE 🧡 (200k+ Contexto) ${!anthropicConnected ? '⚠️ NÃO CONECTADO' : ''}`}>
                    {anthropicModels.filter(m => anthropicConnected || m.is_finetuned).map(m => (
                        <option key={m.id} value={m.id} title={`API: ${m.real_id || m.id}`}>
                            🧡 {m.id} [{m.context_window || '200k'}] {m.supports_tools ? '🛠️' : ''} {m.supports_temperature ? '🔥' : ''}
                        </option>
                    ))}
                    {!anthropicConnected && <option disabled>⚠️ Configure ANTHROPIC_API_KEY no .env</option>}
                </optgroup>
            )}
            {openaiModels.length > 0 && (
                <optgroup label={`OPENAI GPT 🌐 (128k Contexto) ${!openaiConnected ? '⚠️ NÃO CONECTADO' : ''}`}>
                    {openaiModels.filter(m => openaiConnected || m.is_finetuned).map(m => (
                        <option key={m.id} value={m.id} title={`API: ${m.real_id || m.id}`}>
                            🌐 {m.id} [{m.context_window || '128k'}] {m.supports_tools ? '🛠️' : ''} {m.supports_temperature ? '🔥' : ''}
                        </option>
                    ))}
                    {!openaiConnected && <option disabled>⚠️ Configure OPENAI_API_KEY no .env</option>}
                </optgroup>
            )}

        </>
    );
};

export const PriceDisplay = ({ modelId }) => {
    const { models } = useConfig();
    const info = models.find(m => m.id === modelId);
    if (!info || info.input === undefined) return null;

    const inputPrice = (info.input * 1000000).toFixed(2);
    const outputPrice = (info.output * 1000000).toFixed(2);

    return (
        <div className="price-display">
            <div className="price-row">
                <span className="price-tag">📥 Input: <b>${inputPrice}</b>/1M tokens</span>
                <span className="price-tag">📤 Output: <b>${outputPrice}</b>/1M tokens</span>
            </div>
            <div className="memory-info">
                <span>🧠 Memória: <b>{info.context_window || '128k'}</b> tokens</span>
            </div>
            {info.real_id && info.real_id !== info.id && (
                <div className="api-version">🔗 Versão API: <b>{info.real_id}</b></div>
            )}
        </div>
    );
};
