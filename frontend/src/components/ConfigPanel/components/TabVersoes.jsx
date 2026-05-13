import React from 'react';
import { useConfig } from '../ConfigContext';
import PromptVersions from '../../PromptVersions';

const TabVersoes = () => {
    const { id, setSystemPrompt, setActiveTab } = useConfig();

    return (
        <div className="fade-in">
            <PromptVersions
                agentId={id}
                onRestore={(text) => {
                    setSystemPrompt(text);
                    setActiveTab('prompts');
                }}
            />
        </div>
    );
};

export default TabVersoes;
