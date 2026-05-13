import React from 'react';
import { useKB } from '../KBContext';

const Header = () => {
    const { kbType, knowledgeBase } = useKB();
    
    return (
        <div
            className="kb-header fade-in"
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '1rem',
                border: '1px solid var(--border-color)',
                marginBottom: '1.5rem'
            }}
        >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.5rem', 
                    border: '1px solid rgba(99, 102, 241, 0.2)' 
                }}>
                    {kbType === 'product' ? '📦' : '📚'}
                </div>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {kbType === 'product' ? 'Base de Produtos' : 'Repositório de FAQs'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                        {Array.isArray(knowledgeBase) ? knowledgeBase.length : 0} itens de conhecimento ativos
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Header;
