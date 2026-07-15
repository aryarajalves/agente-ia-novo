import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';

const GoogleCalendarCard = ({ googleConnected, onConnect, onProvision }) => {
    const [defaultColor, setDefaultColor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!googleConnected) return;
        const fetchConfig = async () => {
            try {
                const res = await api.get('/integrations/google/config');
                const data = await res.json();
                setDefaultColor(data.default_event_color || '');
            } catch (err) {
                console.error("Erro ao buscar configurações do Google Agenda:", err);
            }
        };
        fetchConfig();
    }, [googleConnected]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await api.post('/integrations/google/config', {
                default_event_color: defaultColor || null
            });
            if (res.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: "Preferências do Google Agenda salvas com sucesso!", type: 'success' }
                }));
            } else {
                const errData = await res.json();
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: errData.detail || "Erro ao salvar preferências.", type: 'error' }
                }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: "Erro de rede ao salvar preferências.", type: 'error' }
            }));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="form-section">
            <span className="section-label">Produtividade & Agendas</span>

            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: 'white',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.8rem',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                    }}>
                        📅
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Google Calendar</h4>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Permita que seus agentes criem e consultem eventos na sua agenda central.
                        </p>
                    </div>
                </div>

                <div>
                    {googleConnected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                ✓ CONECTADO
                            </span>
                            <button
                                onClick={onConnect}
                                className="tab-btn"
                                style={{ padding: '8px 16px' }}
                            >
                                Trocar Conta
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onConnect}
                            style={{
                                background: 'white',
                                color: '#0f172a',
                                border: 'none',
                                padding: '0.8rem 1.8rem',
                                borderRadius: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            Conectar Google Agenda
                        </button>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <p style={{ margin: 0, color: '#a5b4fc', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    💡 <strong>Dica:</strong> Uma vez conectado aqui, todos os seus agentes poderão usar as ferramentas do Google Calendar.
                </p>
            </div>

            {googleConnected && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px'
                }}>
                    <h5 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>⚙️ Configurações do Agendamento</h5>
                    
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '6px' }}>Cor padrão dos eventos:</label>
                        <select 
                            value={defaultColor} 
                            onChange={(e) => setDefaultColor(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                outline: 'none',
                                fontSize: '0.85rem'
                            }}
                        >
                            <option value="">Nenhuma (Padrão do Calendário)</option>
                            <option value="azul">Azul</option>
                            <option value="vermelho">Vermelho</option>
                            <option value="verde">Verde</option>
                            <option value="amarelo">Amarelo</option>
                            <option value="roxo">Roxo</option>
                            <option value="rosa">Rosa</option>
                            <option value="laranja">Laranja</option>
                            <option value="lavanda">Lavanda</option>
                        </select>
                    </div>



                    <button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="tab-btn"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'white',
                            color: '#0f172a',
                            border: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.85rem'
                        }}
                    >
                        {isSaving ? <div className="spinner" style={{ width: '16px', height: '16px', margin: 0 }}></div> : 'Salvar Preferências'}
                    </button>
                </div>
            )}

            {googleConnected && (
                <div style={{ marginTop: '1.5rem' }}>
                    <button
                        onClick={onProvision}
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            padding: '1rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚡ Sincronizar Ferramentas de Agendamento no Catálogo
                    </button>
                </div>
            )}
        </div>
    );
};

export default GoogleCalendarCard;
