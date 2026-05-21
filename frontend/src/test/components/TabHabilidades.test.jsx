import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TabHabilidades from '../../components/ConfigPanel/components/TabHabilidades';

// Mock do Contexto de Configuração
const mockSetSelectedTools = vi.fn();
const mockSetKnowledgeBaseIds = vi.fn();
const mockSetRagRetrievalCount = vi.fn();
const mockSetRagTranslationEnabled = vi.fn();
const mockSetRagMultiQueryEnabled = vi.fn();
const mockSetRagRerankEnabled = vi.fn();
const mockSetRagParentExpansionEnabled = vi.fn();
const mockSetRagAgenticEvalEnabled = vi.fn();
const mockSetShowHabilidadesGuide = vi.fn();

const mockConfigValues = {
    kbList: [],
    knowledgeBaseIds: [],
    setKnowledgeBaseIds: mockSetKnowledgeBaseIds,
    ragRetrievalCount: 5,
    setRagRetrievalCount: mockSetRagRetrievalCount,
    ragTranslationEnabled: false,
    setRagTranslationEnabled: mockSetRagTranslationEnabled,
    ragMultiQueryEnabled: false,
    setRagMultiQueryEnabled: mockSetRagMultiQueryEnabled,
    ragRerankEnabled: false,
    setRagRerankEnabled: mockSetRagRerankEnabled,
    ragParentExpansionEnabled: false,
    setRagParentExpansionEnabled: mockSetRagParentExpansionEnabled,
    ragAgenticEvalEnabled: false,
    setRagAgenticEvalEnabled: mockSetRagAgenticEvalEnabled,
    toolsList: [
        { id: 1, name: 'google_calendar_manager', webhook_url: null },
        { id: 2, name: 'transferir_robo', webhook_url: null },
        { id: 3, name: 'webhook_customizado', webhook_url: 'https://webhook.site/test' }
    ],
    selectedTools: [],
    setSelectedTools: mockSetSelectedTools,
    googleConnected: false,
    showHabilidadesGuide: false,
    setShowHabilidadesGuide: mockSetShowHabilidadesGuide
};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TabHabilidades Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfigValues.selectedTools = [];
    });

    it('deve renderizar a seção de Habilidades corretamente', () => {
        renderWithRouter(<TabHabilidades />);
        
        expect(screen.getByText('Ações & Ferramentas (API)')).toBeInTheDocument();
        expect(screen.getByText('Adicionar Habilidades ao Agente')).toBeInTheDocument();
        expect(screen.getByText('Escolher Ferramenta...')).toBeInTheDocument();
    });

    it('deve exibir ferramentas normais no dropdown, mas ocultar transferir_robo', () => {
        // Inicializa selectedTools como vazio, então google_calendar_manager (id 1) e webhook_customizado (id 3) devem aparecer
        renderWithRouter(<TabHabilidades />);
        
        const optionGoogle = screen.queryByText('📅 google_calendar_manager');
        const optionWebhook = screen.queryByText('🔗 webhook_customizado');
        const optionTransferirRobo = screen.queryByText(/transferir_robo/i);

        expect(optionGoogle).toBeInTheDocument();
        expect(optionWebhook).toBeInTheDocument();
        // transferir_robo não deve ser listado
        expect(optionTransferirRobo).not.toBeInTheDocument();
    });

    it('deve renderizar chips das ferramentas normais vinculadas, mas ocultar chip do transferir_robo', () => {
        // Configura as ferramentas id 1 (google_calendar_manager) e id 2 (transferir_robo) como vinculadas
        mockConfigValues.selectedTools = [1, 2];
        
        renderWithRouter(<TabHabilidades />);

        // O chip do google_calendar_manager deve aparecer
        expect(screen.getByText(/google_calendar_manager/i)).toBeInTheDocument();
        
        // O chip do transferir_robo não deve aparecer de jeito nenhum
        const chipTransferirRobo = screen.queryByText(/transferir_robo/i);
        expect(chipTransferirRobo).not.toBeInTheDocument();
    });
});
