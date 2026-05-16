import React, { useState } from 'react';
import { useTranscription } from '../TranscriptionContext';
import { api } from '../../../api/client';


const ManualTranscriptionModal = () => {
    const { showManualModal, setShowManualModal, selectedFolderId } = useTranscription();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [config, setConfig] = useState({
        language: 'pt',
        summarize: true,
        generate_qa: true
    });

    if (!showManualModal) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Selecione um arquivo primeiro');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('config', JSON.stringify(config));
        if (selectedFolderId) formData.append('folder_id', selectedFolderId);

        try {
            const response = await api.post('/knowledge-bases/transcribe', formData);
            if (response.ok) {
                alert('Upload concluído! O processamento iniciou em segundo plano.');
                setShowManualModal(false);
                setFile(null);
            } else {
                alert('Falha no upload');
            }
        } catch (error) {
            alert('Erro de conexão');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-content" style={{
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                padding: '2.5rem', borderRadius: '24px', width: '500px', maxWidth: '90%'
            }}>
                <h2 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    🎙️ Nova Transcrição Manual
                </h2>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Arquivo de Áudio ou Vídeo</label>
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept="audio/*,video/*"
                        style={{
                            width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)',
                            border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white'
                        }}
                    />
                    {file && <p style={{ color: '#6366f1', fontSize: '0.8rem', mt: '0.5rem' }}>✅ {file.name}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="form-group">
                        <label style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Idioma</label>
                        <select 
                            value={config.language} 
                            onChange={(e) => setConfig({...config, language: e.target.value})}
                            style={{ width: '100%', padding: '0.8rem', background: '#1e293b', border: 'none', borderRadius: '10px', color: 'white' }}
                        >
                            <option value="pt">Português</option>
                            <option value="en">Inglês</option>
                            <option value="es">Espanhol</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={() => setShowManualModal(false)} 
                        className="refresh-btn"
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleUpload} 
                        disabled={isUploading}
                        className="create-btn"
                        style={{ padding: '0.8rem 1.5rem' }}
                    >
                        {isUploading ? '📤 Enviando...' : '🚀 Iniciar Transcrição'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualTranscriptionModal;
