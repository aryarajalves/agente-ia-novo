import React from 'react';
import ReactDOM from 'react-dom';
import { useConfig } from '../../ConfigContext';
import './ModelSelect.css';

// Grupos de provedores exibidos no dropdown, em ordem. Cada grupo sabe reconhecer
// seus próprios modelos pelo id e qual flag de conectividade (do ConfigContext) checar.
// Adicionar um provedor novo no futuro é só acrescentar um objeto aqui.
const PROVIDER_GROUPS = [
    {
        key: 'gemini',
        label: 'Google Gemini',
        icon: '♊',
        color: '#818cf8',
        contextHint: 'Até 2M de Contexto',
        connectedFlag: 'geminiConnected',
        match: (id) => id.toLowerCase().includes('gemini'),
    },
    {
        key: 'anthropic',
        label: 'Anthropic Claude',
        icon: '🧡',
        color: '#fb923c',
        contextHint: '200k+ Contexto',
        connectedFlag: 'anthropicConnected',
        match: (id) => id.toLowerCase().includes('claude'),
    },
    {
        key: 'openai',
        label: 'OpenAI GPT',
        icon: '🌐',
        color: '#38bdf8',
        contextHint: '128k Contexto',
        connectedFlag: 'openaiConnected',
        match: (id) => !id.toLowerCase().includes('gemini') && !id.toLowerCase().includes('claude'),
    },
];

// Destaca a parte do texto que bateu com a busca, para facilitar achar o modelo certo
// numa lista que só tende a crescer.
const HighlightMatch = ({ text, query }) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="model-select-highlight">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
};

const ModelBadges = ({ model }) => (
    <span className="model-select-badges">
        <span className="model-select-context">[{model.context_window || '128k'}]</span>
        {model.supports_tools && <span title="Suporta ferramentas">🛠️</span>}
        {model.supports_temperature && <span title="Suporta temperatura">🔥</span>}
    </span>
);

/**
 * Combobox customizado de seleção de modelo, com filtro por texto e agrupamento
 * visual por provedor (Google Gemini / Anthropic Claude / OpenAI GPT / Fine-Tuning).
 * Substitui o antigo <select><ModelOptions/></select> nativo, que não permitia digitar
 * para filtrar e tendia a ficar difícil de navegar conforme a lista de modelos cresce.
 */
const ModelSelect = ({ value, onChange, emptyLabel = '— Nenhum —', accentColor = '#6366f1' }) => {
    const { models, openaiConnected, geminiConnected, anthropicConnected } = useConfig();
    const connectivity = { geminiConnected, anthropicConnected, openaiConnected };

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [highlightIdx, setHighlightIdx] = React.useState(-1);
    const [panelStyle, setPanelStyle] = React.useState(null);
    const triggerRef = React.useRef(null);
    const panelRef = React.useRef(null);
    const searchRef = React.useRef(null);

    // O painel é renderizado num portal (direto no <body>), fora de qualquer seção com
    // backdrop-filter/transform — essas propriedades criam um novo "contexto de
    // empilhamento" no CSS, então um z-index alto dentro da seção não é suficiente para
    // ficar por cima da PRÓXIMA seção da tela (ela pinta por cima de qualquer jeito).
    // Por isso a posição é calculada manualmente a partir do botão (trigger).
    const updatePanelPosition = React.useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPanelStyle({
            position: 'fixed',
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
        });
    }, []);

    React.useEffect(() => {
        const handler = (e) => {
            const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
            const clickedPanel = panelRef.current && panelRef.current.contains(e.target);
            if (!clickedTrigger && !clickedPanel) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    React.useEffect(() => {
        if (open) {
            setQuery('');
            setHighlightIdx(-1);
            updatePanelPosition();
            setTimeout(() => searchRef.current?.focus(), 0);

            // Reposiciona se a página rolar (inclusive dentro de containers internos com
            // scroll próprio, por isso `capture: true`) ou se a janela for redimensionada.
            window.addEventListener('scroll', updatePanelPosition, true);
            window.addEventListener('resize', updatePanelPosition);
            return () => {
                window.removeEventListener('scroll', updatePanelPosition, true);
                window.removeEventListener('resize', updatePanelPosition);
            };
        }
    }, [open, updatePanelPosition]);

    const safeModels = Array.isArray(models) ? models : [];
    const tunedModels = safeModels.filter((m) => m.is_finetuned);

    // Monta os grupos (provedor -> modelos), aplicando o filtro de texto em todos eles.
    const groups = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        const matchesQuery = (m) => !q || m.id.toLowerCase().includes(q);

        const providerGroups = PROVIDER_GROUPS.map((group) => {
            const groupModels = safeModels.filter((m) => !m.is_finetuned && group.match(m.id) && matchesQuery(m));
            return { ...group, models: groupModels, connected: connectivity[group.connectedFlag] };
        }).filter((g) => g.models.length > 0);

        const finetunedGroup = tunedModels.filter(matchesQuery).length > 0
            ? [{
                key: 'finetuned',
                label: 'Fine-Tuning',
                icon: '🎛️',
                color: '#a78bfa',
                contextHint: 'Modelos treinados sob medida',
                connected: true,
                models: tunedModels.filter(matchesQuery),
            }]
            : [];

        return [...providerGroups, ...finetunedGroup];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeModels, query, geminiConnected, anthropicConnected, openaiConnected]);

    // Lista "achatada" só com as opções que podem ser escolhidas (conectadas ou fine-tuned),
    // usada para a navegação por teclado (setas + Enter).
    const flatSelectable = React.useMemo(() => {
        const flat = [];
        groups.forEach((g) => {
            g.models.forEach((m) => {
                if (g.connected || m.is_finetuned) flat.push(m);
            });
        });
        return flat;
    }, [groups]);

    const selectedModel = safeModels.find((m) => m.id === value);

    const handleSelect = (modelId) => {
        onChange(modelId);
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((prev) => Math.min(prev + 1, flatSelectable.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((prev) => Math.max(prev - 1, 0));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIdx >= 0 && flatSelectable[highlightIdx]) {
                handleSelect(flatSelectable[highlightIdx].id);
            }
            return;
        }
    };

    return (
        <div className="model-select" style={{ '--model-select-accent': accentColor }}>
            <button
                ref={triggerRef}
                type="button"
                className={`model-select-trigger ${open ? 'is-open' : ''}`}
                onClick={() => setOpen((o) => !o)}
            >
                {selectedModel ? (
                    <span className="model-select-trigger-value">
                        <span className="model-select-icon">
                            {PROVIDER_GROUPS.find((g) => g.match(selectedModel.id))?.icon || '🎛️'}
                        </span>
                        <span className="model-select-id">{selectedModel.id}</span>
                        <ModelBadges model={selectedModel} />
                    </span>
                ) : (
                    <span className="model-select-placeholder">{emptyLabel}</span>
                )}
                <span className="model-select-caret">{open ? '▲' : '▼'}</span>
            </button>

            {open && panelStyle && ReactDOM.createPortal(
                <div ref={panelRef} className="model-select-panel" style={panelStyle}>
                    <div className="model-select-search-wrap">
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setHighlightIdx(-1); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite para filtrar modelos..."
                            className="model-select-search"
                        />
                    </div>

                    <div className="model-select-list">
                        <div
                            className={`model-select-option model-select-none ${!value ? 'is-selected' : ''}`}
                            onClick={() => handleSelect('')}
                        >
                            {emptyLabel}
                        </div>

                        {groups.length === 0 && (
                            <div className="model-select-empty">Nenhum modelo encontrado para "{query}"</div>
                        )}

                        {groups.map((group) => (
                            <div key={group.key} className="model-select-group">
                                <div className="model-select-group-header" style={{ color: group.color }}>
                                    <span>{group.icon} {group.label.toUpperCase()}</span>
                                    <span className="model-select-group-hint">{group.contextHint}</span>
                                    {!group.connected && <span className="model-select-group-warning">⚠️ NÃO CONECTADO</span>}
                                </div>
                                {group.models.map((m) => {
                                    const isSelectable = group.connected || m.is_finetuned;
                                    const flatIdx = flatSelectable.indexOf(m);
                                    const isHighlighted = flatIdx !== -1 && flatIdx === highlightIdx;
                                    return (
                                        <div
                                            key={m.id}
                                            className={`model-select-option ${value === m.id ? 'is-selected' : ''} ${!isSelectable ? 'is-disabled' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                                            title={isSelectable ? `API: ${m.real_id || m.id}` : `Configure a chave de API para usar este modelo`}
                                            onClick={() => isSelectable && handleSelect(m.id)}
                                        >
                                            <span className="model-select-id">
                                                <HighlightMatch text={m.id} query={query} />
                                            </span>
                                            <ModelBadges model={m} />
                                        </div>
                                    );
                                })}
                                {!group.connected && (
                                    <div className="model-select-group-config-hint">
                                        Configure a variável de API correspondente no .env para liberar este provedor.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ModelSelect;
