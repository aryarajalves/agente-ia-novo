import React from 'react';

const QuestionItem = ({
    question,
    index,
    status,
    match,
    onLearn,
    onCopy,
    isCopied
}) => {
    return (
        <div className={`question-item ${status || ''}`}>
            <div className="q-main">
                <span className="q-text">{question}</span>
                {status === 'green' && <span className="badge green">Coberto</span>}
                {status === 'yellow' && <span className="badge yellow">Parcial</span>}
                {status === 'red' && <span className="badge red">Sem Resposta</span>}
            </div>

            {match && (
                <div className="match-info">
                    <strong>Na Base:</strong> {match.answer}
                </div>
            )}

            <div className="q-actions">
                {status === 'red' && (
                    <button className="btn-learn" onClick={() => onLearn(question)}>+ Aprender</button>
                )}
                <button
                    className="btn-copy"
                    onClick={() => onCopy(question, index)}
                >
                    {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
            </div>
        </div>
    );
};

export default QuestionItem;
