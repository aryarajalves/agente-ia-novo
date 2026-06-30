/**
 * conditionalParser.js
 * Funções puras para detectar e parsear blocos condicionais no texto do prompt.
 * Sintaxe suportada:
 *   # Título Opcional
 *   [IF:var == valor]
 *   Texto verdadeiro
 *   [ELIF:var2 >= valor2]
 *   Texto elif
 *   [ELSE]
 *   Texto falso
 *   [/IF]
 */

const OPERATORS_ORDERED = ['>=', '<=', '!=', '==', '>', '<'];

/**
 * Parseia uma expressão de condição simples: "var op valor"
 * @param {string} expr
 * @returns {{ variable: string, operator: string, value: string }}
 */
export const parseSimpleCondition = (expr = '') => {
    const trimmed = expr.trim();
    for (const op of OPERATORS_ORDERED) {
        const idx = trimmed.indexOf(op);
        if (idx !== -1) {
            return {
                variable: trimmed.substring(0, idx).trim(),
                operator: op,
                value: trimmed.substring(idx + op.length).trim(),
            };
        }
    }
    // Sem operador — apenas verificação de existência
    return { variable: trimmed, operator: '==', value: '' };
};

/**
 * Parseia uma expressão que pode conter AND:
 * "var1 op1 val1 AND var2 op2 val2"
 * @param {string} expr
 * @returns {{
 *   variable: string, operator: string, value: string,
 *   hasAnd: boolean, andVar: string, andOperator: string, andValue: string
 * }}
 */
export const parseConditionExpression = (expr = '') => {
    const andMatch = expr.match(/^(.+?)\s+AND\s+(.+)$/i);
    if (andMatch) {
        const primary = parseSimpleCondition(andMatch[1]);
        const secondary = parseSimpleCondition(andMatch[2]);
        return {
            ...primary,
            hasAnd: true,
            andVar: secondary.variable,
            andOperator: secondary.operator,
            andValue: secondary.value,
        };
    }
    return {
        ...parseSimpleCondition(expr),
        hasAnd: false,
        andVar: '',
        andOperator: '==',
        andValue: '',
    };
};

/**
 * Parseia todos os blocos condicionais [IF:...]...[/IF] no texto completo do prompt.
 * @param {string} text - Texto completo do prompt
 * @returns {Array<{
 *   title: string|null,
 *   titleLineIdx: number|null,
 *   ifLineIdx: number,
 *   blockStartLine: number,
 *   blockEndLine: number,
 *   variable: string,
 *   operator: string,
 *   value: string,
 *   hasAnd: boolean,
 *   andVar: string,
 *   andOperator: string,
 *   andValue: string,
 *   trueText: string,
 *   elifsList: Array<{ id: number, variable: string, operator: string, value: string, trueText: string }>,
 *   falseText: string,
 * }>}
 */
export const parseConditionalBlocks = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const ifMatch = line.match(/^\[IF:(.+)\]$/);

        if (ifMatch) {
            const condExpr = ifMatch[1];

            // Linha de título opcional antes do [IF:]
            const hasTitleBefore = i > 0 && lines[i - 1].trim().startsWith('#');
            const titleLineIdx = hasTitleBefore ? i - 1 : null;
            const title = hasTitleBefore ? lines[i - 1].trim().replace(/^#+\s*/, '') : null;
            const blockStartLine = titleLineIdx !== null ? titleLineIdx : i;
            const ifLineIdx = i;

            const parsedCond = parseConditionExpression(condExpr);

            let trueLines = [];
            let elifsRaw = []; // [{ expr, lines[] }]
            let elseLines = [];
            let phase = 'true'; // 'true' | 'elif' | 'else'
            let currentElifExpr = null;
            let currentElifLines = [];
            let blockEndLine = i;

            i++;
            while (i < lines.length) {
                const l = lines[i];
                const elifMatch = l.match(/^\[ELIF:(.+)\]$/);
                const isElse = l.trim() === '[ELSE]';
                const isEndIf = l.trim() === '[/IF]';

                if (elifMatch) {
                    if (phase === 'elif') {
                        elifsRaw.push({ expr: currentElifExpr, lines: currentElifLines });
                    }
                    phase = 'elif';
                    currentElifExpr = elifMatch[1];
                    currentElifLines = [];
                } else if (isElse) {
                    if (phase === 'elif') {
                        elifsRaw.push({ expr: currentElifExpr, lines: currentElifLines });
                        currentElifLines = [];
                    }
                    phase = 'else';
                } else if (isEndIf) {
                    if (phase === 'elif') {
                        elifsRaw.push({ expr: currentElifExpr, lines: currentElifLines });
                    }
                    blockEndLine = i;
                    break;
                } else {
                    if (phase === 'true') trueLines.push(l);
                    else if (phase === 'elif') currentElifLines.push(l);
                    else elseLines.push(l);
                }
                i++;
            }

            // Parseia cada ELIF
            const elifsList = elifsRaw.map((e, idx) => {
                const elifCond = parseSimpleCondition(e.expr);
                return {
                    id: Date.now() + idx * 37 + Math.random(),
                    variable: elifCond.variable,
                    operator: elifCond.operator,
                    value: elifCond.value,
                    trueText: e.lines.join('\n'),
                };
            });

            blocks.push({
                title,
                titleLineIdx,
                ifLineIdx,
                blockStartLine,
                blockEndLine,
                variable: parsedCond.variable,
                operator: parsedCond.operator,
                value: parsedCond.value,
                hasAnd: parsedCond.hasAnd,
                andVar: parsedCond.andVar,
                andOperator: parsedCond.andOperator,
                andValue: parsedCond.andValue,
                trueText: trueLines.join('\n'),
                elifsList,
                falseText: elseLines.join('\n'),
            });
        }

        i++;
    }

    return blocks;
};

/**
 * Serializa um bloco condicional de volta para sua representação textual.
 */
export const serializeBlock = (block, condExpr) => {
    let lines = [];
    if (condExpr) {
        lines.push(`[IF:${condExpr}]`);
    } else {
        const primaryCond = block.hasAnd 
            ? `${block.variable} ${block.operator} ${block.value} AND ${block.andVar} ${block.andOperator} ${block.andValue}`
            : `${block.variable} ${block.operator} ${block.value}`;
        lines.push(`[IF:${primaryCond}]`);
    }
    
    lines.push(block.trueText);
    
    if (block.elifsList && block.elifsList.length > 0) {
        block.elifsList.forEach(elif => {
            const cond = `${elif.variable} ${elif.operator} ${elif.value}`;
            lines.push(`[ELIF:${cond}]`);
            lines.push(elif.trueText);
        });
    }
    
    if (block.falseText) {
        lines.push('[ELSE]');
        lines.push(block.falseText);
    }
    
    lines.push('[/IF]');
    return lines.join('\n');
};

/**
 * Colapsa visualmente os blocos condicionais em placeholders de linha única.
 */
export const collapsePrompt = (fullText) => {
    if (!fullText) return '';
    const blocks = parseConditionalBlocks(fullText);
    const lines = fullText.split('\n');
    
    // Processa do final para o início para que os índices de linha permaneçam corretos
    for (let j = blocks.length - 1; j >= 0; j--) {
        const block = blocks[j];
        const ifLine = lines[block.ifLineIdx];
        if (!ifLine) continue;
        const match = ifLine.match(/^\[IF:(.+)\]$/);
        const condExpr = match ? match[1] : '';
        const collapsedLine = `[IF:${condExpr}] {...} [/IF]`;
        
        lines.splice(block.ifLineIdx, block.blockEndLine - block.ifLineIdx + 1, collapsedLine);
    }
    return lines.join('\n');
};

/**
 * Reconstrói o prompt expandido a partir da versão colapsada e a lista de blocos originais.
 */
export const reconstructPrompt = (displayedText, originalBlocks) => {
    if (!displayedText) return '';
    const lines = displayedText.split('\n');
    let blockIdx = 0;
    
    const reconstructedLines = lines.map(line => {
        const match = line.match(/^\[IF:(.+)\] \{\s*\.\.\.\s*\} \[\/IF\]$/);
        if (match) {
            const condExpr = match[1];
            const originalBlock = originalBlocks[blockIdx];
            blockIdx++;
            if (originalBlock) {
                return serializeBlock(originalBlock, condExpr);
            }
        }
        return line;
    });
    
    return reconstructedLines.join('\n');
};
