import React, { useState } from 'react';

const parseRagData = (raw) => {
    if (!raw) return { header: '', items: [], modules: null };
    let modules = null;
    let cleanRaw = raw;
    const modulesMatch = raw.match(/===MODULES_JSON===\n([\s\S]*?)\n===END_MODULES===/);
    if (modulesMatch) {
        try { modules = JSON.parse(modulesMatch[1]); } catch (_) {}
        cleanRaw = raw.replace(/\n?===MODULES_JSON===[\s\S]*?===END_MODULES===/g, '').trim();
    }
    const itemRegex = /---\s*Item\s*(\d+)\s*\(Relev[aâ]ncia:\s*([^)]+)\)\s*---\s*\nPerg:\s*([\s\S]*?)\nResp:\s*([\s\S]*?)(?=(?:\n?---\s*Item\s*\d+)|$)/g;
    const items = [];
    let match;
    while ((match = itemRegex.exec(cleanRaw)) !== null) {
        items.push({ idx: match[1], relevance: (match[2]||'').trim(), question: (match[3]||'').trim(), answer: (match[4]||'').trim() });
    }
    const firstItemIdx = cleanRaw.search(/---\s*Item\s*\d+/);
    const header = (firstItemIdx !== -1 ? cleanRaw.slice(0, firstItemIdx) : cleanRaw).trim();
    return { header, items, modules };
};

const relevanceTier = (s) => {
    const n = parseFloat((s||'').replace('%','').replace(',','.'));
    if (isNaN(n)) return { color:'#64748b', bg:'rgba(100,116,139,0.1)', border:'rgba(100,116,139,0.25)', pct:0 };
    if (n>=75) return { color:'#34d399', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.3)', pct:n };
    if (n>=50) return { color:'#fbbf24', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)', pct:n };
    return { color:'#f87171', bg:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.3)', pct:n };
};

const MODULE_DEFS = {
    translation:      { label:'Translation',     icon:'🌐', desc:'Detecta o idioma e traduz a pergunta para português antes de buscar' },
    multi_query:      { label:'MultiQuery',       icon:'🔁', desc:'Gera variações da pergunta para ampliar a cobertura da busca' },
    rerank:           { label:'Rerank',           icon:'📊', desc:'Reordena os resultados por relevância semântica usando IA' },
    parent_expansion: { label:'ParentExpansion',  icon:'📄', desc:'Substitui itens por seus documentos pai para mais contexto' },
    agentic_eval:     { label:'AgenticEval',      icon:'🤖', desc:'Filtra itens irrelevantes com avaliação autônoma por IA' },
};

const ModuleDetail = ({ moduleKey, moduleData }) => {
    const box = { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'12px', padding:'1rem', marginTop:'0.75rem', fontSize:'0.82rem', color:'#cbd5e1', lineHeight:1.7 };
    if (moduleKey==='translation') return (
        <div style={box}>
            {moduleData.idioma_detectado && <div>🗣️ <strong>Idioma detectado:</strong> <span style={{color:'#a5b4fc'}}>{moduleData.idioma_detectado}</span></div>}
            {moduleData.query_traduzida ? <div>📝 <strong>Query traduzida:</strong> <em style={{color:'#fbbf24'}}>"{moduleData.query_traduzida}"</em></div>
              : <div style={{color:'#64748b'}}>Idioma já é português — tradução não necessária.</div>}
        </div>
    );
    if (moduleKey==='multi_query') {
        const vars = moduleData.variacoes||[];
        return (
            <div style={box}>
                <div style={{marginBottom:'0.5rem'}}>🔁 <strong>{vars.length}</strong> variações geradas:</div>
                {vars.map((v,i)=>(
                    <div key={i} style={{display:'flex',gap:'8px'}}>
                        <span style={{color:'#818cf8',fontWeight:700,minWidth:'18px'}}>{i+1}.</span>
                        <span style={{color:'#a5b4fc',fontStyle:'italic'}}>"{v}"</span>
                    </div>
                ))}
            </div>
        );
    }
    if (moduleKey==='rerank') {
        const antes=moduleData.ordem_antes||[]; const depois=moduleData.ordem_depois||[];
        return (
            <div style={box}>
                <div style={{marginBottom:'0.75rem'}}>{moduleData.reordenou ? '✅ A ordem dos itens foi alterada pelo Rerank.' : <span style={{color:'#64748b'}}>↔️ A ordem permaneceu igual após o Rerank.</span>}</div>
                {antes.length>0 && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                        <div>
                            <div style={{fontSize:'0.65rem',fontWeight:800,color:'#64748b',marginBottom:'0.4rem',textTransform:'uppercase'}}>Antes</div>
                            {antes.map((q,i)=><div key={i} style={{padding:'3px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#64748b',fontSize:'0.78rem'}}>{i+1}. {q||'—'}</div>)}
                        </div>
                        <div>
                            <div style={{fontSize:'0.65rem',fontWeight:800,color:'#818cf8',marginBottom:'0.4rem',textTransform:'uppercase'}}>Depois</div>
                            {depois.map((q,i)=><div key={i} style={{padding:'3px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#c7d2fe',fontSize:'0.78rem'}}>{i+1}. {q||'—'}</div>)}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    if (moduleKey==='parent_expansion') {
        const n=moduleData.itens_expandidos||0;
        return <div style={box}>{n>0 ? <div>📄 <strong style={{color:'#34d399'}}>{n}</strong> item(ns) substituído(s) pelo documento pai.</div> : <div style={{color:'#64748b'}}>Nenhum item tinha documento pai — sem expansão.</div>}</div>;
    }
    if (moduleKey==='agentic_eval') return (
        <div style={box}>
            <div style={{display:'flex',gap:'2rem'}}>
                <div>✅ <strong style={{color:'#34d399',fontSize:'1rem'}}>{moduleData.itens_mantidos}</strong> <span style={{color:'#94a3b8'}}>itens mantidos</span></div>
                <div>❌ <strong style={{color:'#f87171',fontSize:'1rem'}}>{moduleData.itens_descartados}</strong> <span style={{color:'#94a3b8'}}>itens descartados</span></div>
            </div>
        </div>
    );
    return null;
};

export const RagViewerModal = ({ data, onClose }) => {
    const [activeTab, setActiveTab] = useState('items');
    const [expandedModule, setExpandedModule] = useState(null);
    if (!data) return null;
    const { header, items, modules } = parseRagData(data);
    const activeModuleCount = modules ? Object.values(modules).filter(m=>m?.ativo).length : 0;

    const tabBtn = (tab, label) => (
        <button id={`rag-tab-${tab}`} onClick={()=>setActiveTab(tab)} style={{
            padding:'0.55rem 1.1rem', borderRadius:'10px', fontSize:'0.8rem', fontWeight:700, cursor:'pointer', transition:'all 0.2s',
            border: activeTab===tab ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
            background: activeTab===tab ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
            color: activeTab===tab ? '#a5b4fc' : '#64748b',
        }}>{label}</button>
    );

    return (
        <div id="rag-viewer-modal" className="fade-in" style={{position:'fixed',inset:0,zIndex:1200,background:'rgba(2,6,23,0.95)',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(145deg,#0f172a 0%,#1e293b 100%)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'24px',width:'100%',maxWidth:'850px',height:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 50px 100px rgba(0,0,0,0.9),0 0 40px rgba(99,102,241,0.1)',overflow:'hidden'}}>

                {/* Header */}
                <div style={{padding:'1.5rem 2rem',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.02)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,#34d399 0%,#059669 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',boxShadow:'0 0 20px rgba(16,185,129,0.2)'}}>📚</div>
                        <div>
                            <div style={{fontWeight:800,color:'#fff',fontSize:'1.1rem'}}>Consulta à Base de Conhecimento (RAG)</div>
                            <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>
                                {items.length>0 ? `${items.length} item${items.length>1?'s':''} relevante${items.length>1?'s':''} encontrado${items.length>1?'s':''}` : 'Detalhes da busca vetorial'}
                                {modules ? ` · ${activeModuleCount} módulo${activeModuleCount!==1?'s':''} ativo${activeModuleCount!==1?'s':''}` : ''}
                            </div>
                        </div>
                    </div>
                    <button id="rag-modal-close" onClick={onClose} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',borderRadius:'12px',width:'36px',height:'36px',cursor:'pointer',fontSize:'1rem'}}>✕</button>
                </div>

                {/* Abas */}
                <div style={{padding:'0.75rem 2rem',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:'0.5rem',background:'rgba(255,255,255,0.01)'}}>
                    {tabBtn('items', `📚 Itens Relevantes${items.length>0?' ('+items.length+')':''}`)}
                    {tabBtn('modules', `⚙️ Módulos da Busca${modules?' · '+activeModuleCount+' ativos':''}`)}
                </div>

                {/* Corpo */}
                <div style={{flex:1,overflowY:'auto',padding:'2rem',color:'#cbd5e1'}} className="custom-scrollbar">

                    {/* TAB 1 — Itens Relevantes */}
                    {activeTab==='items' && (
                        <>
                            {header && <div style={{fontSize:'0.85rem',color:'#94a3b8',marginBottom:items.length>0?'1.5rem':0,lineHeight:1.6}}>{header}</div>}
                            {items.length===0 ? (!header && <div style={{padding:'2rem',textAlign:'center',background:'rgba(255,255,255,0.02)',borderRadius:'12px',color:'#64748b'}}>Nenhum detalhe disponível.</div>)
                            : (
                                <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                                    {items.map(item=>{
                                        const tier=relevanceTier(item.relevance);
                                        return (
                                            <div key={item.idx} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${tier.border}`,borderRadius:'16px',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.85rem'}}>
                                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                                    <span style={{fontSize:'0.7rem',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em'}}>Item {item.idx}</span>
                                                    <span style={{display:'inline-flex',alignItems:'center',gap:'6px',background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`,padding:'3px 10px',borderRadius:'8px',fontSize:'0.7rem',fontWeight:800}}>🎯 Relevância: {item.relevance}</span>
                                                </div>
                                                <div style={{width:'100%',height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden'}}>
                                                    <div style={{width:`${Math.max(2,Math.min(100,tier.pct))}%`,height:'100%',background:tier.color,borderRadius:'3px',transition:'width 0.3s ease'}} />
                                                </div>
                                                <div>
                                                    <div style={{fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',color:'#818cf8',marginBottom:'4px'}}>💬 Pergunta da Base</div>
                                                    <div style={{fontSize:'0.9rem',color:'#fff',lineHeight:1.5,fontWeight:600}}>{item.question||'-'}</div>
                                                </div>
                                                <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.75rem'}}>
                                                    <div style={{fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',color:'#94a3b8',marginBottom:'4px'}}>✍️ Resposta Integrada ao Contexto</div>
                                                    <div style={{fontSize:'0.85rem',color:'#e2e8f0',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{item.answer||'-'}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* TAB 2 — Módulos da Busca */}
                    {activeTab==='modules' && (
                        <>
                            {!modules ? (
                                <div style={{padding:'2.5rem',textAlign:'center',background:'rgba(255,255,255,0.02)',borderRadius:'14px',color:'#64748b'}}>
                                    <div style={{fontSize:'2rem',marginBottom:'0.75rem'}}>⚙️</div>
                                    <div style={{fontWeight:600,marginBottom:'0.4rem'}}>Informações de módulos não disponíveis</div>
                                    <div style={{fontSize:'0.75rem',color:'#475569'}}>Disponível apenas em buscas realizadas após a última atualização.</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(195px, 1fr))',gap:'0.75rem',marginBottom:'1.5rem'}}>
                                        {Object.entries(MODULE_DEFS).map(([key,def])=>{
                                            const modData=modules[key];
                                            const isActive=modData?.ativo===true;
                                            return (
                                                <div key={key}>
                                                    <button id={`rag-module-${key}`} onClick={()=>isActive&&setExpandedModule(key)} style={{
                                                        width:'100%',textAlign:'left',transition:'all 0.2s',
                                                        background: isActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                                        border: isActive ? '1px solid rgba(99,102,241,0.22)' : '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius:'14px',padding:'0.9rem',
                                                        cursor: isActive ? 'pointer' : 'default',
                                                    }}>
                                                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}>
                                                            <span style={{fontSize:'1.05rem'}}>{def.icon}</span>
                                                            <span style={{fontSize:'0.68rem',fontWeight:800,textTransform:'uppercase',color:isActive?'#a5b4fc':'#475569',letterSpacing:'0.04em',flex:1}}>{def.label}</span>
                                                            <span style={{fontSize:'0.62rem',fontWeight:700,padding:'2px 7px',borderRadius:'6px',background:isActive?'rgba(52,211,153,0.12)':'rgba(100,116,139,0.08)',color:isActive?'#34d399':'#475569',border:`1px solid ${isActive?'rgba(52,211,153,0.25)':'rgba(100,116,139,0.15)'}`}}>
                                                                {isActive?'✓ ATIVO':'✕ OFF'}
                                                            </span>
                                                        </div>
                                                        <div style={{fontSize:'0.72rem',color:'#64748b',lineHeight:1.5}}>{def.desc}</div>
                                                        {isActive && <div style={{marginTop:'0.5rem',fontSize:'0.68rem',color:'#818cf8',fontWeight:600}}>Ver detalhes →</div>}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{padding:'0.9rem 1.25rem',background:'rgba(255,255,255,0.02)',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.06)',fontSize:'0.8rem',color:'#94a3b8',lineHeight:1.7}}>
                                        <strong style={{color:'#cbd5e1'}}>ℹ️ Pipeline desta busca:</strong>{' '}
                                        {activeModuleCount===0 ? 'Apenas busca vetorial + FTS. Nenhum módulo de pós-processamento ativo.' : `${activeModuleCount} módulo${activeModuleCount!==1?'s':''} ativo${activeModuleCount!==1?'s':''}. Clique em um módulo para ver o que ele fez nesta busca.`}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Popup centralizado de detalhe do módulo */}
            {expandedModule && modules && modules[expandedModule]?.ativo && (
                <div
                    id="rag-module-detail-popup"
                    className="fade-in"
                    style={{
                        position: 'absolute', inset: 0, zIndex: 200,
                        background: 'rgba(2,6,23,0.82)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, #0f172a 0%, #1a2540 100%)',
                            border: '1px solid rgba(99,102,241,0.4)',
                            borderRadius: '20px',
                            width: '100%', maxWidth: '560px',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.95), 0 0 60px rgba(99,102,241,0.2)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(99,102,241,0.07)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                {MODULE_DEFS[expandedModule]?.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{MODULE_DEFS[expandedModule]?.label}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{MODULE_DEFS[expandedModule]?.desc}</div>
                            </div>
                            <button
                                id="rag-module-popup-close"
                                onClick={() => setExpandedModule(null)}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: '10px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
                            >{String.fromCharCode(10005)}</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <ModuleDetail moduleKey={expandedModule} moduleData={modules[expandedModule]} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── POPUP DE DETALHE DO MÓDULO ───────────────────────────────────────────────
// Renderizado FORA do componente principal para evitar clipping do overflow:hidden
export const ModuleDetailPopup = ({ moduleKey, modules, onClose }) => {
    if (!moduleKey || !modules) return null;
    const modData = modules[moduleKey];
    const def = MODULE_DEFS[moduleKey];
    if (!modData || !def) return null;

    return (
        <div
            id="rag-module-detail-popup"
            className="fade-in"
            style={{
                position: 'fixed', inset: 0, zIndex: 1400,
                background: 'rgba(2,6,23,0.88)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1a2540 100%)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: '20px',
                    width: '100%', maxWidth: '580px',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 50px rgba(99,102,241,0.15)',
                    overflow: 'hidden',
                }}
            >
                {/* Header do popup */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(99,102,241,0.06)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {def.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{def.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{def.desc}</div>
                    </div>
                    <button
                        id="rag-module-popup-close"
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
                    >✕</button>
                </div>

                {/* Corpo do popup */}
                <div style={{ padding: '1.5rem' }}>
                    <ModuleDetail moduleKey={moduleKey} moduleData={modData} />
                </div>
            </div>
        </div>
    );
};

export default RagViewerModal;
