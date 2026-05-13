import React from 'react';
import { useTools } from '../ToolsContext';

const ToolCard = ({ tool }) => {
    const { setEditingTool, setNewTool, setParameters } = useTools();

    const handleEdit = () => {
        setEditingTool(tool);
        setNewTool({ name: tool.name, description: tool.description, webhook_url: tool.webhook_url });
        // Logic to parse parameters from schema would go here
    };

    return (
        <div className="agent-card tool-card">
            <div className="card-header">
                <h3>{tool.name}</h3>
                <button onClick={handleEdit} className="edit-btn">Editar</button>
            </div>
            <p className="description">{tool.description}</p>
            <div className="card-footer">
                <span className="badge">API</span>
                {tool.webhook_url && <span className="badge webhook">Webhook</span>}
            </div>
        </div>
    );
};

export default ToolCard;
