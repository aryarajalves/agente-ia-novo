import React from 'react';

export const ExpandableDetail = ({ text }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const isLong = text && text.length > 200;
    
    if (!text) return null;

    return (
        <div style={{
            fontSize: '0.8rem', color: '#94a3b8',
            wordBreak: 'break-word', lineHeight: 1.5,
            background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px',
            padding: '0.5rem 0.75rem', marginTop: '0.5rem',
            border: '1px solid rgba(255,255,255,0.03)',
            position: 'relative'
        }}>
            <div style={{ 
                maxHeight: isExpanded ? 'none' : '80px',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                opacity: 0.8
            }}>
                {text}
            </div>
            {isLong && (
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        color: '#6366f1', 
                        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                        marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                >
                    {isExpanded ? '↑ Recolher' : '↓ Ver tudo'}
                </div>
            )}
        </div>
    );
};
