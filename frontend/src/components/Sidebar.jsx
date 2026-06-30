import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { API_URL, AGENT_API_KEY } from '../config';

const Sidebar = ({ onLogout }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [userData, setUserData] = useState({ 
        name: '', 
        email: '', 
        password: '',
        company_name: '',
        company_logo: '',
        company_logo_size: 'medium'
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');
    const [companyLogoSize, setCompanyLogoSize] = useState(localStorage.getItem('company_logo_size') || 'medium');

    useEffect(() => {
        document.title = companyName ? companyName : 'Agente de IA';
    }, [companyName]);

    const userRole = localStorage.getItem('user_role') || 'Usuário';
    const isSuperAdmin = userRole === 'Super Admin';
    const isAdmin = userRole === 'Admin';
    const isUser = userRole === 'Usuário';

    const fetchUserData = async () => {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'X-API-Key': AGENT_API_KEY
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUserData({ 
                    name: data.name || '', 
                    email: data.email || '', 
                    password: '',
                    company_name: data.company_name || '',
                    company_logo: data.company_logo || '',
                    company_logo_size: data.company_logo_size || 'medium'
                });
                
                if (data.company_name !== undefined) {
                    localStorage.setItem('company_name', data.company_name || '');
                    setCompanyName(data.company_name || '');
                }
                if (data.company_logo !== undefined) {
                    localStorage.setItem('company_logo', data.company_logo || '');
                    setCompanyLogo(data.company_logo || '');
                }
                if (data.company_logo_size !== undefined) {
                    localStorage.setItem('company_logo_size', data.company_logo_size || 'medium');
                    setCompanyLogoSize(data.company_logo_size || 'medium');
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'X-API-Key': AGENT_API_KEY
                },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    password: userData.password || undefined,
                    company_name: userData.company_name,
                    company_logo: userData.company_logo,
                    company_logo_size: userData.company_logo_size
                })
            });
            if (response.ok) {
                const updated = await response.json();
                if (updated && updated.name) {
                    localStorage.setItem('user_name', updated.name);
                }
                localStorage.setItem('company_name', updated.company_name || '');
                localStorage.setItem('company_logo', updated.company_logo || '');
                localStorage.setItem('company_logo_size', updated.company_logo_size || 'medium');
                setCompanyName(updated.company_name || '');
                setCompanyLogo(updated.company_logo || '');
                setCompanyLogoSize(updated.company_logo_size || 'medium');

                setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
                setTimeout(() => {
                    setShowSettingsModal(false);
                    setStatus({ type: '', message: '' });
                }, 1500);
            } else {
                const err = await response.json();
                setStatus({ type: 'error', message: err.detail || 'Erro ao atualizar.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro de conexão ou autenticação.' });
        } finally {
            setLoading(false);
        }
    };

    const openSettings = () => {
        setStatus({ type: '', message: '' });
        fetchUserData();
        setShowSettingsModal(true);
    };

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    {companyLogo ? (
                        <img 
                            src={companyLogo} 
                            alt={companyName || 'Logo'} 
                            className={`company-logo-img size-${companyLogoSize}`} 
                        />
                    ) : (
                        <div className="logo-icon">🤖</div>
                    )}
                    <span className="logo-text">{companyName || 'Agent Flow'}</span>
                </div>

                <nav className="sidebar-nav">
                    {(isSuperAdmin || isAdmin || isUser) && (
                        <>
                            <div className="nav-section">
                                <span className="nav-section-title">PRINCIPAL</span>
                                <NavLink
                                    to="/"
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <span className="nav-icon">🤖</span>
                                    <span className="nav-label">Meus Agentes</span>
                                    <div className="active-indicator"></div>
                                </NavLink>
                            </div>

                            {(isSuperAdmin || isAdmin) ? (
                                <>
                                    <div className="nav-section">
                                        <span className="nav-section-title">ATENDIMENTO</span>
                                        <NavLink
                                            to="/support"
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">🎧</span>
                                            <span className="nav-label">Suporte Humano</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                        <NavLink
                                            to="/knowledge-bases?tab=inbox"
                                            className={({ isActive }) => {
                                                const search = (typeof window !== 'undefined' && window.location && window.location.search) || '';
                                                const isInbox = search.includes('tab=inbox');
                                                return `nav-item ${isInbox ? 'active' : ''}`;
                                            }}
                                        >
                                            <span className="nav-icon">📥</span>
                                            <span className="nav-label">Inbox de Dúvidas</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                        <NavLink
                                            to="/lead-scoring"
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">🔥</span>
                                            <span className="nav-label">Lead Scoring</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                        <NavLink
                                            to="/ranking-duvidas"
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">🏆</span>
                                            <span className="nav-label">Ranking de Dúvidas</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                    </div>

                                    <div className="nav-section">
                                        <span className="nav-section-title">CONHECIMENTO</span>
                                        <NavLink
                                            to="/knowledge-bases"
                                            className={({ isActive }) => {
                                                const search = (typeof window !== 'undefined' && window.location && window.location.search) || '';
                                                const isInbox = search.includes('tab=inbox');
                                                return `nav-item ${isActive && !isInbox ? 'active' : ''}`;
                                            }}
                                        >
                                            <span className="nav-icon">📚</span>
                                            <span className="nav-label">Bases de Conhecimento</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                    </div>

                                    <div className="nav-section">
                                        <span className="nav-section-title">SISTEMA</span>
                                        <NavLink
                                            to="/financeiro"
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">💰</span>
                                            <span className="nav-label">Financeiro</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                        <NavLink
                                            to="/integrations"
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">🔌</span>
                                            <span className="nav-label">Integrações</span>
                                            <div className="active-indicator"></div>
                                        </NavLink>
                                    </div>
                                </>
                            ) : (
                                /* Usuário comum vê apenas o Ranking de Dúvidas */
                                <div className="nav-section">
                                    <span className="nav-section-title">ATENDIMENTO</span>
                                    <NavLink
                                        to="/ranking-duvidas"
                                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon">🏆</span>
                                        <span className="nav-label">Ranking de Dúvidas</span>
                                        <div className="active-indicator"></div>
                                    </NavLink>
                                </div>
                            )}
                        </>
                    )}



                    {isSuperAdmin && (
                        <div className="nav-section">
                            <span className="nav-section-title">ADMINISTRAÇÃO</span>
                            <NavLink
                                to="/users"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">👥</span>
                                <span className="nav-label">Gestão de Usuários</span>
                                <div className="active-indicator"></div>
                            </NavLink>
                            <NavLink
                                to="/backups"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">🗄️</span>
                                <span className="nav-label">Backups do Sistema</span>
                                <div className="active-indicator"></div>
                            </NavLink>
                        </div>
                    )}

                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-container">
                        <div className="user-profile">
                            <div className="user-avatar text-white">
                                {(localStorage.getItem('user_name') || 'A')[0]}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{localStorage.getItem('user_name') || 'Usuário'}</span>
                                <span className="user-role">{localStorage.getItem('user_role') || 'Admin'}</span>
                            </div>
                        </div>
                        <button 
                            className="settings-sidebar-btn" 
                            onClick={openSettings}
                            title="Configurações de Perfil"
                        >
                            ⚙️
                        </button>
                    </div>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="logout-btn-new"
                        title="Sair do sistema"
                    >
                        <span className="logout-btn-icon">🚪</span>
                        <span>Sair do Painel</span>
                    </button>
                </div>
            </aside>

            {showSettingsModal && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <span className="modal-icon">⚙️</span>
                        <h2 className="modal-title">Configurações de Perfil</h2>
                        <p className="modal-message">Atualize seus dados de acesso ao Agent Flow.</p>
                        
                        <form onSubmit={handleUpdateUser} className="settings-form" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={userData.name}
                                    onChange={e => setUserData({...userData, name: e.target.value})}
                                    placeholder="Seu nome"
                                    required
                                    autoComplete="name"
                                />
                            </div>

                            {!isSuperAdmin && (
                                <>
                                    <div className="form-group">
                                        <label>E-mail (Login)</label>
                                        <input 
                                            type="email" 
                                            value={userData.email}
                                            onChange={e => setUserData({...userData, email: e.target.value})}
                                            placeholder="seu@email.com"
                                            required
                                            autoComplete="username"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Nova Senha (deixe em branco para manter)</label>
                                        <input 
                                            type="password" 
                                            value={userData.password}
                                            onChange={e => setUserData({...userData, password: e.target.value})}
                                            placeholder="Sua senha secreta"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Nome da Empresa (White-label)</label>
                                <input 
                                    type="text" 
                                    value={userData.company_name || ''}
                                    onChange={e => setUserData({...userData, company_name: e.target.value})}
                                    placeholder="Ex: Minha Empresa"
                                />
                            </div>

                            <div className="form-group">
                                <label>Logo da Empresa (Upload)</label>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    padding: '1.25rem',
                                    textAlign: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'border-color 0.2s ease, background-color 0.2s ease'
                                }}>
                                    {userData.company_logo ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
                                            <img 
                                                src={userData.company_logo} 
                                                alt="Preview da Logo" 
                                                style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserData({...userData, company_logo: ''});
                                                }}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                                                onMouseOut={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.2)'; e.target.style.color = '#f87171'; }}
                                            >
                                                Remover Logo
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>📤</span>
                                            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '500' }}>Clique ou arraste uma imagem aqui</span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PNG, JPG ou SVG (Máx. 2MB)</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setUserData({...userData, company_logo: reader.result});
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer',
                                            zIndex: 1
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Tamanho da Logo na Sidebar</label>
                                <select 
                                    value={userData.company_logo_size || 'medium'}
                                    onChange={e => setUserData({...userData, company_logo_size: e.target.value})}
                                    className="form-control-select"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="small" style={{ backgroundColor: '#0f172a' }}>Pequeno</option>
                                    <option value="medium" style={{ backgroundColor: '#0f172a' }}>Médio</option>
                                    <option value="large" style={{ backgroundColor: '#0f172a' }}>Grande</option>
                                </select>
                            </div>

                            {status.message && (
                                <div className={`status-message ${status.type}`} style={{ marginBottom: '1.5rem' }}>
                                    {status.message}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="modal-btn modal-btn-cancel"
                                    onClick={() => setShowSettingsModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="modal-btn modal-btn-confirm"
                                    style={{ background: 'var(--primary-color)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showLogoutModal && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <span className="modal-icon">👋</span>
                        <h2 className="modal-title">Até logo!</h2>
                        <p className="modal-message">
                            Você tem certeza que deseja encerrar sua sessão no painel do Agent Flow?
                        </p>
                        <div className="modal-actions">
                            <button
                                className="modal-btn modal-btn-cancel"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="modal-btn modal-btn-confirm"
                                onClick={onLogout}
                            >
                                Sim, Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
