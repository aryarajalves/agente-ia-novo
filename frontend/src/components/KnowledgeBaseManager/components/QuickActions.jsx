import React, { useRef } from 'react';
import { useKB } from '../KBContext';
import { useNavigate } from 'react-router-dom';
import { uploadManager } from '../../../api/uploadManager';

const QuickActions = () => {
    const { 
        kbType, kbId, 
        setIsTranscribing, setPendingFile, setShowImporter,
        transcriptionConfig 
    } = useKB();
    const navigate = useNavigate();
    const videoInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setPendingFile(file);
                setShowImporter(true);
            }
        };
        input.click();
    };

    const handleVideoTranscribe = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        uploadManager.startUpload(kbId, file, transcriptionConfig);
        navigate('/knowledge-bases?tab=history');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = '';
        setPendingFile(file);
        setShowImporter(true);
    };

    return (
        <div className="kb-quick-actions">
            <button onClick={handleImportClick} className="kb-quick-action-btn">📥 Importar CSV / Excel</button>
            {kbType !== 'product' && (
                <>
                    <button onClick={() => setShowImporter(true)} className="kb-quick-action-btn">📋 Colar Texto</button>
                    <button onClick={() => videoInputRef.current.click()} className="kb-quick-action-btn">
                        📽️ Transcrição de Vídeo
                    </button>
                    <button onClick={() => fileInputRef.current.click()} className="kb-quick-action-btn">
                        📄 Upload PDF/DOCX
                    </button>
                    <input
                        type="file"
                        ref={videoInputRef}
                        style={{ display: 'none' }}
                        onChange={handleVideoTranscribe}
                        accept="video/*,audio/*"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.txt"
                    />
                </>
            )}
        </div>
    );
};

export default QuickActions;
