import { useTools } from '../ToolsContext';
import { api } from '../../../api/client';

export const useToolsActions = () => {
    const { 
        tools, setTools, editingTool, newTool, parameters, setStatus,
        selectedLabelsToAdd, selectedLabelsToRemove, toolConfirmationMessages
    } = useTools();

    const generateSchema = () => {
        const properties = {};
        const required = [];
        const bindings = {};

        parameters.forEach(p => {
            if (p.name.trim()) {
                if (p.required) required.push(p.name.trim());
                if (!p.binding) {
                    properties[p.name.trim()] = { type: p.type, description: p.description };
                } else {
                    bindings[p.name.trim()] = p.binding;
                }
            }
        });

        return JSON.stringify({
            type: "object",
            properties,
            required,
            _bindings: bindings
        });
    };

    const handleSave = async () => {
        const schema = generateSchema();
        const isEditing = editingTool !== null;
        
        const toolData = { 
            ...newTool, 
            parameters_schema: schema,
            labels_to_add: isEditing ? JSON.stringify(selectedLabelsToAdd[editingTool.id] || []) : '[]',
            labels_to_remove: isEditing ? JSON.stringify(selectedLabelsToRemove[editingTool.id] || []) : '[]',
            confirmation_message: isEditing ? (toolConfirmationMessages[editingTool.id] || '') : ''
        };

        try {
            const url = isEditing ? `/tools/${editingTool.id}` : `/tools`;
            const res = isEditing ? await api.put(url, toolData) : await api.post(url, toolData);
            
            if (res.ok) {
                const savedTool = await res.json();
                if (isEditing) setTools(tools.map(t => t.id === savedTool.id ? savedTool : t));
                else setTools([...tools, savedTool]);
                setStatus('✅ Salvo com sucesso!');
                return true;
            }
        } catch (err) {
            setStatus('❌ Erro ao salvar.');
        }
        return false;
    };

    return { handleSave, generateSchema };
};
