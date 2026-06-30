import React from 'react';

/**
 * useConditionalBuilder
 * Hook que gerencia todo o estado e lógica do construtor de condicionais.
 * Extraído de index.jsx para modularização e reutilização.
 */

const TEMPORAL_VARS = [
    { key: 'data_atual', desc: 'Data de hoje em formato AAAA-MM-DD (ex: 2026-06-01)' },
    { key: 'dia_semana', desc: 'Nome do dia da semana atual (ex: segunda-feira)' },
    { key: 'hora_atual', desc: 'Horário do sistema (ex: 10:20)' },
    { key: 'dias_desde_criacao', desc: 'Quantidade de dias desde que o contato/lead foi gerado' },
];

export { TEMPORAL_VARS };

const useConditionalBuilder = (globalVarsList = []) => {
    const [selectedVar, setSelectedVar] = React.useState(null);
    const [condOperator, setCondOperator] = React.useState('==');
    const [condValue, setCondValue] = React.useState('');
    const [addAndCondition, setAddAndCondition] = React.useState(false);
    const [andVar, setAndVar] = React.useState('');
    const [andOperator, setAndOperator] = React.useState('==');
    const [andValue, setAndValue] = React.useState('');
    const [condTrueText, setCondTrueText] = React.useState('');
    const [condFalseText, setCondFalseText] = React.useState('');
    const [elifsList, setElifsList] = React.useState([]);
    const [condTitle, setCondTitle] = React.useState('');

    /** Inicia configuração de uma nova condicional para uma variável */
    const handleStartConfigure = (varKey) => {
        setSelectedVar(varKey);
        setCondOperator('==');
        setCondValue('');
        setAddAndCondition(false);
        setAndVar('');
        setAndOperator('==');
        setAndValue('');
        setCondTrueText(`Texto se ${varKey} for verdadeiro`);
        setCondFalseText(`Texto se ${varKey} for falso`);
        setElifsList([]);
        setCondTitle(`Condicional de ${varKey}`);
    };

    /** Pré-preenche todo o estado com dados de um bloco já parseado (modo edição) */
    const populateFromBlock = (block) => {
        setSelectedVar(block.variable);
        setCondOperator(block.operator || '==');
        setCondValue(block.value || '');
        setAddAndCondition(block.hasAnd || false);
        setAndVar(block.andVar || '');
        setAndOperator(block.andOperator || '==');
        setAndValue(block.andValue || '');
        setCondTrueText(block.trueText || '');
        setCondFalseText(block.falseText || '');
        setElifsList(
            (block.elifsList || []).map((e) => ({
                ...e,
                id: e.id || Date.now() + Math.random(),
            }))
        );
        setCondTitle(block.title || `Condicional de ${block.variable}`);
    };

    /** Reseta o estado do builder para criação de nova condicional */
    const resetBuilder = () => {
        setSelectedVar(null);
        setCondOperator('==');
        setCondValue('');
        setAddAndCondition(false);
        setAndVar('');
        setAndOperator('==');
        setAndValue('');
        setCondTrueText('');
        setCondFalseText('');
        setElifsList([]);
        setCondTitle('');
    };

    const handleAddElif = () => {
        setElifsList((prev) => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                variable: '',
                operator: '==',
                value: '',
                trueText: 'Texto se esta condição for verdadeira',
            },
        ]);
    };

    const handleRemoveElif = (id) => {
        setElifsList((prev) => prev.filter((item) => item.id !== id));
    };

    const handleUpdateElif = (id, field, val) => {
        setElifsList((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
        );
    };

    /** Renderiza input adequado ao tipo de variável */
    const renderValueInput = (varName, value, setValue, inputId) => {
        if (varName === 'dia_semana') {
            const dias = [
                'segunda-feira', 'terça-feira', 'quarta-feira',
                'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
            ];
            return (
                <select
                    id={inputId}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="cond-custom-select"
                >
                    <option value="">Selecione o dia...</option>
                    {dias.map((d) => (
                        <option key={d} value={d}>
                            {d}
                        </option>
                    ))}
                </select>
            );
        }
        if (varName === 'data_atual') {
            return (
                <input
                    id={inputId}
                    type="date"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="cond-custom-input"
                />
            );
        }
        if (varName === 'hora_atual') {
            return (
                <input
                    id={inputId}
                    type="time"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="cond-custom-input"
                />
            );
        }
        return (
            <input
                id={inputId}
                type="text"
                placeholder="Ex: Valor ou chave..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="cond-custom-input"
            />
        );
    };

    /** Gera o snippet de texto do condicional com base no estado atual */
    const getGeneratedSnippet = () => {
        if (!selectedVar) return '';

        let baseCond = `${selectedVar} ${condOperator} ${condValue || '?'}`;
        if (condOperator === '==' && !condValue) {
            baseCond = `${selectedVar}`;
        }

        if (addAndCondition && andVar) {
            let andCond = `${andVar} ${andOperator} ${andValue || '?'}`;
            if (andOperator === '==' && !andValue) {
                andCond = `${andVar}`;
            }
            baseCond = `${baseCond} AND ${andCond}`;
        }

        let snippet = `# ${condTitle || `Condicional de ${selectedVar}`}\n[IF:${baseCond}]\n${condTrueText || 'Texto se for verdadeiro'}`;

        if (elifsList && elifsList.length > 0) {
            elifsList.forEach((elif) => {
                const varName = elif.variable || '?';
                let elifCond = `${varName} ${elif.operator} ${elif.value || '?'}`;
                if (elif.operator === '==' && !elif.value) {
                    elifCond = varName;
                }
                snippet += `\n[ELIF:${elifCond}]\n${elif.trueText || 'Texto se for verdadeiro'}`;
            });
        }

        snippet += `\n[ELSE]\n${condFalseText || 'Texto se for falso'}\n[/IF]`;
        return snippet;
    };

    const allVars = [...TEMPORAL_VARS, ...(globalVarsList || [])];

    return {
        // Estado
        selectedVar, setSelectedVar,
        condOperator, setCondOperator,
        condValue, setCondValue,
        addAndCondition, setAddAndCondition,
        andVar, setAndVar,
        andOperator, setAndOperator,
        andValue, setAndValue,
        condTrueText, setCondTrueText,
        condFalseText, setCondFalseText,
        elifsList,
        condTitle, setCondTitle,
        // Ações
        handleStartConfigure,
        populateFromBlock,
        resetBuilder,
        handleAddElif,
        handleRemoveElif,
        handleUpdateElif,
        renderValueInput,
        getGeneratedSnippet,
        // Dados
        temporalVars: TEMPORAL_VARS,
        allVars,
    };
};

export default useConditionalBuilder;
