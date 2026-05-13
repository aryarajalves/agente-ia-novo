import React from 'react';
import { PromptGeneratorProvider, usePromptGenerator } from './PromptGeneratorContext';
import { usePromptGeneratorData } from './hooks/usePromptGeneratorData';
import GeneratorHeader from './components/GeneratorHeader';
import BaseFields from './components/BaseFields';
import PromptPreview from './components/PromptPreview';
import RefinementChat from './components/RefinementChat';
import PublishModal from './components/PublishModal';
import MaximizeModal from './components/MaximizeModal';
import './styles/PromptGenerator.css';

const GeneratorContent = () => {
    const { isGenerating, showPublishModal, maximizedField } = usePromptGenerator();
    usePromptGeneratorData();

    return (
        <div className="generator-container fade-in">
            {isGenerating && (
                <div className="global-loading-overlay">
                    <div className="loading-content">
                        <div className="pulse-circle"></div>
                        <span>O Engenheiro de Prompts está trabalhando... ✨</span>
                    </div>
                </div>
            )}

            <GeneratorHeader />

            <div className="workspace">
                <BaseFields />
                <div className="right-panels-column">
                    <PromptPreview />
                    <RefinementChat />
                </div>
            </div>

            {showPublishModal && <PublishModal />}
            {maximizedField && <MaximizeModal />}
        </div>
    );
};

const PromptGenerator = () => (
    <PromptGeneratorProvider>
        <GeneratorContent />
    </PromptGeneratorProvider>
);

export default PromptGenerator;
