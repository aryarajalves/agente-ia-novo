import React from 'react';

export const AllowedContactsSection = ({ contacts = [], inputValue = '', onInputChange, onAdd, onRemove }) => {
    const safeContacts = Array.isArray(contacts) ? contacts : [];
    return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span>✅</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Contatos Permitidos</span>
            <span style={{ fontSize: '0.68rem', color: '#22c55e', background: '#22c55e11', border: '1px solid #22c55e33', borderRadius: '4px', padding: '1px 6px', fontWeight: 600, marginLeft: 'auto' }}>
                {safeContacts.length === 0 ? 'TODOS LIBERADOS' : `${safeContacts.length} restrito${safeContacts.length !== 1 ? 's' : ''}`}
            </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
            Se vazio, <strong style={{ color: '#94a3b8' }}>qualquer contato</strong> pode acionar a automação. Adicione telefones ou nomes para restringir a contatos específicos.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
                type="text"
                placeholder='Ex: +5511999998888 ou "João Silva"'
                value={inputValue || ''}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
                style={{ flex: 1, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.9rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="button" onClick={onAdd} style={{ background: '#22c55e22', border: '1px solid #22c55e44', color: '#22c55e', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                + Adicionar
            </button>
        </div>
        {safeContacts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {safeContacts.map((c, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#22c55e11', border: '1px solid #22c55e33', borderRadius: '20px', padding: '3px 10px 3px 12px', fontSize: '0.8rem', color: '#86efac' }}>
                        {c}
                        <button type="button" onClick={() => onRemove(c)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, padding: 0, marginLeft: '2px' }}>✕</button>
                    </span>
                ))}
            </div>
        )}
    </div>
    );
};


export const BlockedMessagesSection = ({ messages = [], inputValue = '', onInputChange, onAdd, onRemove }) => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span>🚫</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Mensagens Bloqueadas</span>
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: '4px', padding: '1px 6px', fontWeight: 600, marginLeft: 'auto' }}>OPCIONAL</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
            Mensagens que <strong style={{ color: '#94a3b8' }}>não</strong> acionam a automação. Útil para respostas de botão de template (ex: "Sim", "Não", "Confirmar").
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
                type="text"
                placeholder='Ex: "Sim", "Não", "Parar"'
                value={inputValue || ''}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
                style={{ flex: 1, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.9rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="button" onClick={onAdd} style={{ background: '#334155', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                + Adicionar
            </button>
        </div>
        {safeMessages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {safeMessages.map((msg, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 10px 3px 12px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                        {msg}
                        <button type="button" onClick={() => onRemove(msg)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, padding: 0, marginLeft: '2px' }}>✕</button>
                    </span>
                ))}
            </div>
        )}
    </div>
    );
};

