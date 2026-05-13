import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Integridade do CSS Modular', () => {
    const indexPath = path.resolve(__dirname, '../index.css');
    
    it('deve possuir o arquivo index.css', () => {
        expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('os arquivos de estilo importados devem existir no sistema de arquivos', () => {
        const content = fs.readFileSync(indexPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().startsWith('@import'));
        
        expect(lines.length).toBeGreaterThan(0);

        lines.forEach(line => {
            const match = line.match(/'([^']+)'/);
            if (match) {
                const relativePath = match[1];
                const absolutePath = path.resolve(path.dirname(indexPath), relativePath);
                expect(fs.existsSync(absolutePath)).toBe(true);
                
                const stats = fs.statSync(absolutePath);
                expect(stats.size).toBeGreaterThan(0);
            }
        });
    });
});
