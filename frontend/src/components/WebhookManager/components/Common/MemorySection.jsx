import React from 'react';
import { getMemoryUrl } from '../../utils/helpers';

export const MemorySection = ({ config, setConfig, accentColor = '#818cf8' }) => {
    const memoryUrl = getMemoryUrl(config.token, config.memory_token);
    const [copied, setCopied] = React.useState(false);

    const copyUrl = () => {
        navigator.clipboard.writeText(memoryUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ background: '#1e293b', border: `1px solid ${accentColor}11`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🧠</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: accentColor, textTransform: 'uppercase' }}>Sincronização de Memória Automática</span>
                <div style={{ marginLeft: 'auto' }}>
                    <button 
                        type="button"
                        onClick={() => setConfig({ ...config, memory_sync_enabled: !config.memory_sync_enabled })}
                        style={{ 
                            flexShrink: 0, width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', 
                            background: config.memory_sync_enabled ? accentColor : '#334155', 
                            position: 'relative', transition: 'background 0.2s' 
                        }}
                    >
                        <span style={{ position: 'absolute', top: '3px', left: config.memory_sync_enabled ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                </div>
            </div>

            {config.memory_sync_enabled && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase' }}>🔗 Slug da URL de Memória / Token *</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Personalize o final da URL exclusiva para sincronizar memória.</p>
                    <input type="text" value={config.memory_token}
                        onChange={e => setConfig({ ...config, memory_token: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.7rem 0.9rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>
            )}

            {config.memory_sync_enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: 'rgba(129, 140, 248, 0.05)', border: '1px solid rgba(129, 140, 248, 0.1)', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>✨</span>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                            <strong>Configuração Zero:</strong> O sistema identifica automaticamente o contato pelos campos <code>phone</code>, <code>telefone</code> ou <code>sender.phone</code> e salva <strong>todos os outros campos</strong> na memória.
                        </p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>URL para Automação da Memória</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', gap: '0.5rem' }}>
                            <code style={{ flex: 1, color: '#818cf8', fontSize: '0.75rem', wordBreak: 'break-all', opacity: 0.8 }}>{memoryUrl}</code>
                            <button 
                                type="button" 
                                onClick={copyUrl}
                                style={{ background: copied ? '#22c55e22' : '#334155', border: 'none', color: copied ? '#22c55e' : '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.6rem', margin: '0.6rem 0 0' }}>
                            Use esta URL no seu n8n, Typeform ou Elementor para enviar os dados que devem ser lembrados pelo Agente.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemorySection;
