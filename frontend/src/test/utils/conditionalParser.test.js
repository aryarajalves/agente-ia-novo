import { describe, it, expect } from 'vitest';
import {
    parseSimpleCondition,
    parseConditionExpression,
    parseConditionalBlocks,
    collapsePrompt,
    reconstructPrompt,
    serializeBlock,
} from '../../components/PromptEditor/utils/conditionalParser';

describe('conditionalParser - parseSimpleCondition', () => {
    it('deve parsear condição com operador ==', () => {
        const result = parseSimpleCondition('data_atual == 2026-06-01');
        expect(result.variable).toBe('data_atual');
        expect(result.operator).toBe('==');
        expect(result.value).toBe('2026-06-01');
    });

    it('deve parsear condição com operador >=', () => {
        const result = parseSimpleCondition('hora_atual >= 08:00');
        expect(result.variable).toBe('hora_atual');
        expect(result.operator).toBe('>=');
        expect(result.value).toBe('08:00');
    });

    it('deve parsear condição com operador <=', () => {
        const result = parseSimpleCondition('dias_desde_criacao <= 7');
        expect(result.variable).toBe('dias_desde_criacao');
        expect(result.operator).toBe('<=');
        expect(result.value).toBe('7');
    });

    it('deve parsear condição com operador !=', () => {
        const result = parseSimpleCondition('dia_semana != domingo');
        expect(result.variable).toBe('dia_semana');
        expect(result.operator).toBe('!=');
        expect(result.value).toBe('domingo');
    });

    it('deve parsear condição com operador >', () => {
        const result = parseSimpleCondition('dias_desde_criacao > 30');
        expect(result.variable).toBe('dias_desde_criacao');
        expect(result.operator).toBe('>');
        expect(result.value).toBe('30');
    });

    it('deve parsear condição com operador <', () => {
        const result = parseSimpleCondition('dias_desde_criacao < 5');
        expect(result.variable).toBe('dias_desde_criacao');
        expect(result.operator).toBe('<');
        expect(result.value).toBe('5');
    });

    it('deve retornar operador == e valor vazio para expressão sem operador', () => {
        const result = parseSimpleCondition('minha_variavel');
        expect(result.variable).toBe('minha_variavel');
        expect(result.operator).toBe('==');
        expect(result.value).toBe('');
    });
});

describe('conditionalParser - parseConditionExpression', () => {
    it('deve parsear condição simples sem AND', () => {
        const result = parseConditionExpression('data_atual == 2026-06-01');
        expect(result.variable).toBe('data_atual');
        expect(result.operator).toBe('==');
        expect(result.value).toBe('2026-06-01');
        expect(result.hasAnd).toBe(false);
        expect(result.andVar).toBe('');
    });

    it('deve parsear condição com AND', () => {
        const result = parseConditionExpression('data_atual >= 2026-11-20 AND data_atual <= 2026-11-27');
        expect(result.variable).toBe('data_atual');
        expect(result.operator).toBe('>=');
        expect(result.value).toBe('2026-11-20');
        expect(result.hasAnd).toBe(true);
        expect(result.andVar).toBe('data_atual');
        expect(result.andOperator).toBe('<=');
        expect(result.andValue).toBe('2026-11-27');
    });

    it('deve parsear condição de existência simples (sem operador)', () => {
        const result = parseConditionExpression('variavel_teste');
        expect(result.variable).toBe('variavel_teste');
        expect(result.hasAnd).toBe(false);
        expect(result.value).toBe('');
    });
});

describe('conditionalParser - parseConditionalBlocks', () => {
    it('deve retornar array vazio para texto sem condicionais', () => {
        const result = parseConditionalBlocks('Olá! Eu sou um bot.');
        expect(result).toEqual([]);
    });

    it('deve retornar array vazio para string nula', () => {
        expect(parseConditionalBlocks(null)).toEqual([]);
        expect(parseConditionalBlocks('')).toEqual([]);
    });

    it('deve detectar um bloco IF simples sem ELIF', () => {
        const text = [
            '# Regra de Horário',
            '[IF:hora_atual >= 08:00]',
            'Bom dia!',
            '[ELSE]',
            'Boa noite!',
            '[/IF]',
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        expect(blocks).toHaveLength(1);

        const block = blocks[0];
        expect(block.title).toBe('Regra de Horário');
        expect(block.titleLineIdx).toBe(0);
        expect(block.ifLineIdx).toBe(1);
        expect(block.blockStartLine).toBe(0);
        expect(block.blockEndLine).toBe(5);
        expect(block.variable).toBe('hora_atual');
        expect(block.operator).toBe('>=');
        expect(block.value).toBe('08:00');
        expect(block.trueText).toBe('Bom dia!');
        expect(block.falseText).toBe('Boa noite!');
        expect(block.elifsList).toHaveLength(0);
    });

    it('deve detectar bloco IF com múltiplos ELIFs', () => {
        const text = [
            '# Campanha de Black Friday',
            '[IF:data_atual < 2026-11-20]',
            'Falta pouco!',
            '[ELIF:data_atual >= 2026-11-20]',
            'Black Friday ativa!',
            '[ELIF:dia_semana == domingo]',
            'É domingo!',
            '[ELSE]',
            'Campanha encerrada.',
            '[/IF]',
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        expect(blocks).toHaveLength(1);

        const block = blocks[0];
        expect(block.variable).toBe('data_atual');
        expect(block.trueText).toBe('Falta pouco!');
        expect(block.falseText).toBe('Campanha encerrada.');
        expect(block.elifsList).toHaveLength(2);
        expect(block.elifsList[0].variable).toBe('data_atual');
        expect(block.elifsList[0].operator).toBe('>=');
        expect(block.elifsList[0].value).toBe('2026-11-20');
        expect(block.elifsList[0].trueText).toBe('Black Friday ativa!');
        expect(block.elifsList[1].variable).toBe('dia_semana');
        expect(block.elifsList[1].operator).toBe('==');
        expect(block.elifsList[1].value).toBe('domingo');
    });

    it('deve detectar múltiplos blocos IF no mesmo texto', () => {
        const text = [
            '# Regra 1',
            '[IF:hora_atual >= 08:00]',
            'Bom dia!',
            '[ELSE]',
            'Boa noite!',
            '[/IF]',
            '',
            '# Regra 2',
            '[IF:dia_semana == segunda-feira]',
            'Boa semana!',
            '[ELSE]',
            'Outro dia.',
            '[/IF]',
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        expect(blocks).toHaveLength(2);
        expect(blocks[0].variable).toBe('hora_atual');
        expect(blocks[1].variable).toBe('dia_semana');
        expect(blocks[1].ifLineIdx).toBe(8);
    });

    it('deve detectar bloco IF sem título anterior', () => {
        const text = [
            '[IF:variavel_teste]',
            'Existe!',
            '[ELSE]',
            'Não existe.',
            '[/IF]',
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].title).toBeNull();
        expect(blocks[0].titleLineIdx).toBeNull();
        expect(blocks[0].blockStartLine).toBe(0); // começa no próprio [IF:]
        expect(blocks[0].ifLineIdx).toBe(0);
        expect(blocks[0].variable).toBe('variavel_teste');
        expect(blocks[0].operator).toBe('==');
        expect(blocks[0].value).toBe('');
    });

    it('deve detectar bloco IF com condição AND', () => {
        const text = [
            '# Com AND',
            '[IF:data_atual >= 2026-11-20 AND data_atual <= 2026-11-27]',
            'Black Friday!',
            '[ELSE]',
            'Fora da campanha.',
            '[/IF]',
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        expect(blocks).toHaveLength(1);
        const block = blocks[0];
        expect(block.hasAnd).toBe(true);
        expect(block.andVar).toBe('data_atual');
        expect(block.andOperator).toBe('<=');
        expect(block.andValue).toBe('2026-11-27');
    });
});

describe('conditionalParser - collapse and reconstruct', () => {
    const originalText = [
        'Olá! Eu sou um bot.',
        '# Regra 1',
        '[IF:hora_atual >= 08:00]',
        'Bom dia!',
        '[ELSE]',
        'Boa noite!',
        '[/IF]',
        'Texto no meio.',
        '# Regra 2',
        '[IF:dia_semana == segunda-feira]',
        'Boa semana!',
        '[ELSE]',
        'Outro dia.',
        '[/IF]',
    ].join('\n');

    it('deve colapsar blocos condicionais multilinhas em linhas únicas', () => {
        const collapsed = collapsePrompt(originalText);
        const lines = collapsed.split('\n');
        
        expect(lines).toContain('[IF:hora_atual >= 08:00] {...} [/IF]');
        expect(lines).toContain('[IF:dia_semana == segunda-feira] {...} [/IF]');
        
        // Verifica se os textos internos (Bom dia, Boa semana!) foram removidos na versão exibida
        expect(lines).not.toContain('Bom dia!');
        expect(lines).not.toContain('Boa semana!');
    });

    it('deve reconstruir perfeitamente o prompt original a partir do colapsado', () => {
        const collapsed = collapsePrompt(originalText);
        const blocks = parseConditionalBlocks(originalText);
        
        const reconstructed = reconstructPrompt(collapsed, blocks);
        expect(reconstructed).toBe(originalText);
    });

    it('deve lidar corretamente com a serialização de condicionais com AND', () => {
        const text = [
            '[IF:data_atual >= 2026-11-20 AND data_atual <= 2026-11-27]',
            'Black Friday!',
            '[/IF]'
        ].join('\n');

        const blocks = parseConditionalBlocks(text);
        const collapsed = collapsePrompt(text);
        const reconstructed = reconstructPrompt(collapsed, blocks);
        expect(reconstructed).toContain('AND');
        expect(reconstructed).toBe(text);
    });
});
