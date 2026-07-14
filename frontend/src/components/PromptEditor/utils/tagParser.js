/**
 * tagParser.js
 * Funções puras para detectar tags de organização do prompt no estilo <tagname>...</tagname>
 * (ex: <identidade>, <regras>, <exemplos>), usadas para ajudar o usuário a "fechar" cada
 * seção do prompt (assim como fechar um método/bloco de código), deixando a leitura mais fácil.
 *
 * Regra: a tag precisa estar sozinha na linha (com espaços em branco opcionais ao redor).
 */

const OPEN_TAG_RE = /^\s*<([a-zA-Z_][\w-]*)>\s*$/;
const CLOSE_TAG_RE = /^\s*<\/([a-zA-Z_][\w-]*)>\s*$/;

/**
 * Varre o texto inteiro casando tags de abertura com suas respectivas tags de fechamento
 * (usando uma pilha, na ordem em que aparecem).
 * @param {string} text
 * @returns {{
 *   blocks: Array<{ tagName: string, startLine: number, endLine: number|null, depth: number }>,
 *   topLevelStarts: number[],
 * }}
 */
export const parseTagBlocks = (text) => {
    if (!text) return { blocks: [], topLevelStarts: [] };

    const lines = text.split('\n');
    const stack = [];
    const blocks = [];
    const topLevelStarts = [];

    lines.forEach((line, idx) => {
        const openMatch = line.match(OPEN_TAG_RE);
        const closeMatch = !openMatch ? line.match(CLOSE_TAG_RE) : null;

        if (openMatch) {
            const depth = stack.length;
            if (depth === 0) topLevelStarts.push(idx);
            stack.push({ tagName: openMatch[1], lineIdx: idx, depth });
        } else if (closeMatch) {
            const top = stack[stack.length - 1];
            if (top && top.tagName === closeMatch[1]) {
                stack.pop();
                blocks.push({ tagName: top.tagName, startLine: top.lineIdx, endLine: idx, depth: top.depth });
            }
            // Se a tag de fechamento não bate com o topo da pilha, ignora (evita corromper outros blocos)
        }
    });

    // O que sobrou na pilha nunca foi fechado
    stack.forEach((item) => {
        blocks.push({ tagName: item.tagName, startLine: item.lineIdx, endLine: null, depth: item.depth });
    });

    return { blocks, topLevelStarts: topLevelStarts.sort((a, b) => a - b) };
};

/**
 * Retorna apenas as tags de abertura que ainda não têm uma tag de fechamento correspondente.
 */
export const findUnclosedTags = (text) => {
    const { blocks } = parseTagBlocks(text);
    return blocks.filter((b) => b.endLine === null).sort((a, b) => a.startLine - b.startLine);
};

/**
 * Calcula em qual linha inserir a tag de fechamento: logo antes da próxima tag de nível raiz,
 * ou no final do texto caso não haja mais nenhuma.
 */
export const getTagCloseInsertionLine = (text, startLine) => {
    const { topLevelStarts } = parseTagBlocks(text);
    const next = topLevelStarts.find((l) => l > startLine);
    const lines = text.split('\n');
    return next !== undefined ? next : lines.length;
};

/**
 * Padrão de uma linha "recolhida" (fold) de um bloco de tag: <tagname> {...} </tagname>
 */
export const FOLDED_TAG_LINE_RE = /^<([a-zA-Z_][\w-]*)> \{\.\.\.\} <\/\1>$/;

export const buildFoldedPlaceholder = (tagName) => `<${tagName}> {...} </${tagName}>`;

/**
 * Substitui, no texto, cada bloco fechado cujo nome esteja em `foldedTagNames` por uma
 * única linha-resumo (<tagname> {...} </tagname>). Não altera o texto real armazenado —
 * é usado apenas para gerar a versão exibida no editor.
 *
 * Também devolve `lineNumberMap`: para cada linha do texto resultante, qual é o número
 * real da linha (1-indexed) no texto original — assim a numeração exibida continua batendo
 * com o prompt de verdade mesmo com seções recolhidas acima.
 *
 * @param {string} text
 * @param {Set<string>} foldedTagNames
 * @returns {{ text: string, lineNumberMap: number[] }}
 */
export const collapseFoldedTagBlocks = (text, foldedTagNames) => {
    if (!text) return { text: '', lineNumberMap: [] };

    const lines = text.split('\n');
    const identityMap = () => lines.map((_, i) => i + 1);

    if (!foldedTagNames || foldedTagNames.size === 0) {
        return { text, lineNumberMap: identityMap() };
    }

    const { blocks } = parseTagBlocks(text);
    const closedFoldable = blocks.filter((b) => b.endLine !== null && foldedTagNames.has(b.tagName));
    if (closedFoldable.length === 0) {
        return { text, lineNumberMap: identityMap() };
    }

    // Ordena por início e descarta blocos "filhos" cujo início já esteja dentro de outro
    // bloco recolhido (o pai já esconde tudo, não faz sentido colapsar duas vezes a mesma área).
    const sortedByStart = [...closedFoldable].sort((a, b) => a.startLine - b.startLine);
    const topFolds = [];
    let lastCoveredEnd = -1;
    sortedByStart.forEach((b) => {
        if (b.startLine > lastCoveredEnd) {
            topFolds.push(b);
            lastCoveredEnd = b.endLine;
        }
    });

    const newLines = [];
    const lineNumberMap = [];
    let i = 0;
    let foldIdx = 0;
    while (i < lines.length) {
        const fold = topFolds[foldIdx];
        if (fold && i === fold.startLine) {
            newLines.push(buildFoldedPlaceholder(fold.tagName));
            lineNumberMap.push(fold.startLine + 1); // número real da linha onde a seção começa
            i = fold.endLine + 1;
            foldIdx++;
        } else {
            newLines.push(lines[i]);
            lineNumberMap.push(i + 1);
            i++;
        }
    }

    return { text: newLines.join('\n'), lineNumberMap };
};
