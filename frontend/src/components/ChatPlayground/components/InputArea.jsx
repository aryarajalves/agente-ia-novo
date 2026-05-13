import React from 'react';

const InputArea = ({
    input,
    setInput,
    loading,
    isRecording,
    isInputExpanded,
    setIsInputExpanded,
    handleSendMessage,
    handleVoiceRecord,
    imagePreview,
    selectedImage,
    isUploading,
    handleRemoveImage,
    handleImageSelect,
    fileInputRef,
    sessionId,
    isRegularUser,
    isViewMode,
    isTesterAutoRunning,
    fetchSummary,
    fetchQuestions,
    hasTesterReport,
    fetchTestReport
}) => {
    if (isViewMode) return null;

    return (
        <div className="chat-input-wrapper-modern">
            {/* Preview da Imagem Selecionada */}
            {imagePreview && (
                <div className="image-preview-overlay fade-in">
                    <div className="preview-img-box">
                        <img src={imagePreview} alt="Preview" />
                        {isUploading && (
                            <div className="upload-overlay">
                                <div className="spinner-mini"></div>
                            </div>
                        )}
                    </div>
                    <div className="preview-info">
                        <p className="filename">{selectedImage?.name}</p>
                        <p className="filesize">{(selectedImage?.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={handleRemoveImage} className="remove-preview">✕</button>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="input-container-premium">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
                
                <div className="input-actions-left">
                    <button
                        type="button"
                        className={`action-btn-circle ${imagePreview ? 'active' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || isTesterAutoRunning}
                        title="Enviar imagem"
                    >
                        🖼️
                    </button>
                    <button
                        type="button"
                        className={`action-btn-circle ${isRecording ? 'recording' : ''}`}
                        onClick={handleVoiceRecord}
                        disabled={loading || isTesterAutoRunning}
                        title="Enviar voz"
                    >
                        {isRecording ? '🔴' : '🎙️'}
                    </button>
                </div>

                <textarea
                    className="chat-input-premium custom-scrollbar"
                    placeholder={isTesterAutoRunning ? '🤖 Teste Automático...' : (loading ? 'Pensando...' : 'Mensagem para o agente...')}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading || isTesterAutoRunning}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                    rows={1}
                />

                <button
                    type="submit"
                    className="btn-send-modern"
                    disabled={loading || (!input.trim() && !imagePreview) || isTesterAutoRunning}
                >
                    {isTesterAutoRunning ? '🔄' : (loading ? '⏳' : '🚀')}
                </button>
            </form>
        </div>
    );
};

export default InputArea;
