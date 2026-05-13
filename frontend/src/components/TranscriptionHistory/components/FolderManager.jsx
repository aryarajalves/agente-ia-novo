import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';

const FolderManager = () => {
    const { 
        folders, setFolders, selectedFolderId, setSelectedFolderId, setCurrentPage 
    } = useTranscription();
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const changeFolder = (folderId) => {
        setSelectedFolderId(folderId);
        setCurrentPage(1);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || isCreatingFolder) return;
        setIsCreatingFolder(true);
        try {
            const res = await api.post('/transcription-folders', { name: newFolderName.trim() });
            if (res.ok) {
                const newFolder = await res.json();
                setFolders(prev => [...prev, newFolder]);
                setNewFolderName('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingFolder(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
                onClick={() => changeFolder(null)}
                className={`folder-btn ${selectedFolderId === null ? 'active' : ''}`}
            >
                📁 Todos
            </button>
            {folders.map(folder => (
                <button
                    key={folder.id}
                    onClick={() => changeFolder(folder.id)}
                    className={`folder-btn ${selectedFolderId === folder.id ? 'active' : ''}`}
                >
                    📁 {folder.name}
                </button>
            ))}
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                <input
                    type="text"
                    placeholder="Nova pasta..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    className="folder-input"
                />
                <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    className="add-folder-btn"
                >
                    {isCreatingFolder ? '...' : '➕'}
                </button>
            </div>
        </div>
    );
};

export default FolderManager;
