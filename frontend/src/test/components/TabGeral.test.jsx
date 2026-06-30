import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TabGeral from '../../components/ConfigPanel/components/TabGeral';

// Mock do Contexto de Configuração
const mockSetName = vi.fn();
const mockSetDescription = vi.fn();
const mockSetRouterSimpleModel = vi.fn();
const mockSetRouterSimpleFallbackModel = vi.fn();
const mockSetRouterComplexModel = vi.fn();
const mockSetRouterComplexFallbackModel = vi.fn();
const mockSetShowGeralGuide = vi.fn();
const mockSetConfigRole = vi.fn();
const mockSetModelSettings = vi.fn();
const mockSetTemperature = vi.fn();
const mockSetTopP = vi.fn();
const mockSetTopK = vi.fn();
const mockSetPresencePenalty = vi.fn();
const mockSetFrequencyPenalty = vi.fn();
const mockSetSafetySettings = vi.fn();
const mockSetContextWindow = vi.fn();
const mockSetReasoningEffort = vi.fn();

const mockConfigValues = {
    name: 'Agente Teste',
    setName: mockSetName,
    description: 'Descrição do agente de teste',
    setDescription: mockSetDescription,
    routerSimpleModel: 'gpt-4o-mini',
    setRouterSimpleModel: mockSetRouterSimpleModel,
    routerSimpleFallbackModel: '',
    setRouterSimpleFallbackModel: mockSetRouterSimpleFallbackModel,
    routerComplexModel: 'gpt-4o',
    setRouterComplexModel: mockSetRouterComplexModel,
    routerComplexFallbackModel: '',
    setRouterComplexFallbackModel: mockSetRouterComplexFallbackModel,
    showGeralGuide: false,
    setShowGeralGuide: mockSetShowGeralGuide,
    configRole: 'main',
    setConfigRole: mockSetConfigRole,
    models: [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' }
    ],
    setModelSettings: mockSetModelSettings,
    temperature: 1.0,
    setTemperature: mockSetTemperature,
    topP: 1.0,
    setTopP: mockSetTopP,
    topK: 40,
    setTopK: mockSetTopK,
    presencePenalty: 0.0,
    setPresencePenalty: mockSetPresencePenalty,
    frequencyPenalty: 0.0,
    setFrequencyPenalty: mockSetFrequencyPenalty,
    safetySettings: 'standard',
    setSafetySettings: mockSetSafetySettings,
    contextWindow: 5,
    setContextWindow: mockSetContextWindow,
    reasoningEffort: 'medium',
    setReasoningEffort: mockSetReasoningEffort,
    modelSettings: {},
    routerEnabled: true,
    selectedModel: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
};

vi.mock('../../components/ConfigPanel/ConfigContext', () => ({
    useConfig: () => mockConfigValues
}));

// Mock Shared/ModelControls components to avoid testing third-party structures
vi.mock('../../components/ConfigPanel/components/Shared/ModelControls', () => ({
    ModelOptions: () => (
        <>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
        </>
    ),
    PriceDisplay: ({ modelId }) => <div data-testid="price-display">{modelId ? `Preço para ${modelId}` : 'Sem modelo'}</div>
}));

const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TabGeral Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar a seção Geral sem erros', () => {
        renderWithRouter(<TabGeral />);
        
        expect(screen.getByText('Nome do Agente')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ex: Assistente de Vendas')).toBeInTheDocument();
        expect(screen.getByText('🚦 Roteamento de Modelos (Cost Router)')).toBeInTheDocument();
    });

    it('deve exibir os valores corretos preenchidos do agente', () => {
        renderWithRouter(<TabGeral />);
        
        expect(screen.getByDisplayValue('Agente Teste')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Descrição do agente de teste')).toBeInTheDocument();
    });
});
