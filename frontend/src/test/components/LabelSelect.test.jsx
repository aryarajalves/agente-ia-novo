import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LabelMultiSelect, LabelSingleSelect } from '../../components/WebhookManager/components/Common/LabelSelect';

describe('LabelSelect Componentes', () => {

    describe('LabelMultiSelect', () => {
        it('deve exibir "Nenhuma selecionada" para array vazio', () => {
            render(<LabelMultiSelect selected={[]} options={['tag1', 'tag2']} onChange={() => {}} />);
            expect(screen.getByText('Nenhuma selecionada')).toBeInTheDocument();
        });

        it('deve filtrar e exibir "Nenhuma selecionada" para arrays com strings vazias ou nulas (evitando etiquetas fantasmas)', () => {
            const { container } = render(
                <LabelMultiSelect selected={['', '   ', null, undefined]} options={['tag1']} onChange={() => {}} />
            );
            expect(screen.getByText('Nenhuma selecionada')).toBeInTheDocument();
            // Garante que não foi criado nenhum chip/badge de tag com botão de remoção
            expect(container.querySelector('span[style*="background"]')).not.toBeInTheDocument();
        });

        it('deve renderizar badges apenas para tags válidas', () => {
            render(
                <LabelMultiSelect selected={['tag1', '', 'tag2']} options={['tag1', 'tag2']} onChange={() => {}} />
            );
            expect(screen.queryByText('Nenhuma selecionada')).not.toBeInTheDocument();
            expect(screen.getByText('tag1')).toBeInTheDocument();
            expect(screen.getByText('tag2')).toBeInTheDocument();
        });
    });

    describe('LabelSingleSelect', () => {
        it('deve exibir "Nenhuma selecionada" para string vazia', () => {
            render(<LabelSingleSelect selected="" options={['tag1']} onChange={() => {}} />);
            expect(screen.getByText('Nenhuma selecionada')).toBeInTheDocument();
        });

        it('deve exibir "Nenhuma selecionada" para strings com apenas espaços em branco', () => {
            render(<LabelSingleSelect selected="    " options={['tag1']} onChange={() => {}} />);
            expect(screen.getByText('Nenhuma selecionada')).toBeInTheDocument();
        });

        it('deve renderizar o badge contendo a tag selecionada válida', () => {
            render(<LabelSingleSelect selected="tag1" options={['tag1', 'tag2']} onChange={() => {}} />);
            expect(screen.queryByText('Nenhuma selecionada')).not.toBeInTheDocument();
            expect(screen.getByText('tag1')).toBeInTheDocument();
        });
    });
});
