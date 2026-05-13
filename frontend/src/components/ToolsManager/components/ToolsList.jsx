import React from 'react';
import { useTools } from '../ToolsContext';
import ToolCard from './ToolCard';

const ToolsList = () => {
    const { tools } = useTools();

    return (
        <div className="tools-grid">
            {tools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
            ))}
        </div>
    );
};

export default ToolsList;
