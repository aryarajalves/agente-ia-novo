import React, { useState } from 'react';\r\
2: import TimelineView from './TimelineView';\r\
3: \r\
4: const MessageBubble = ({ \r\
5:     msg, \r\
6:     msgIndex, \r\
7:     isRegularUser, \r\
8:     feedbackState, \r\
9:     handleThumbsUp, \r\
10:     handleThumbsDown, \r\
11:     readFbFromStorage, \r\
12:     selectedAgentId \r\
13: }) => {\r\
14:     const [showDebug, setShowDebug] = useState(false);\r\
15:     const isUser = msg.role === 'user';\r\
16:     \r\
17:     const fbState = feedbackState?.[msgIndex] || (!isUser && msg.content && readFbFromStorage ? readFbFromStorage(selectedAgentId, msg.content) : null);\r\
18:     const canFeedback = !isUser && msg.metrics && !msg.isError && handleThumbsUp && handleThumbsDown;\r\
19: \r\
20:     if (msg.isLink) {\r\
21:         const url = msg.content.trim();\r\
22:         return (\r\
23:             <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`}>\r\
24:                 <div className=\"avatar assistant-avatar\" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>\r\
25:                 <a\r\
26:                     href={url}\r\
27:                     target=\"_blank\"\r\
28:                     rel=\"noopener noreferrer\"\r\
29:                     className=\"link-bubble\"\r\
30:                 >\r\
31:                     <span style={{ fontSize: '1rem' }}>🔗</span>\r\
32:                     <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>\r\
33:                     <span style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>↗</span>\r\
34:                 </a>\r\
35:             </div>\r\
36:         );\r\
37:     }\r\
38: \r\
39:     return (\r\
40:         <>\r\
41:             <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'} ${msg.isSplit ? 'is-split' : ''}`}>\r\
42:                 {!isUser && <div className=\"avatar assistant-avatar\" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>}\r\
43:                 <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>\r\
44:                     {msg.image_url && (\r\
45:                         <div className=\"message-image-container\" style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>\r\
46:                             <img\r\
47:                                 src={msg.image_url}\r\
48:                                 alt=\"Enviada pelo usuário\"\r\
49:                                 style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', cursor: 'zoom-in' }}\r\
50:                                 onClick={() => window.open(msg.image_url, '_blank')}\r\
51:                             />\r\
52:                         </div>\r\
53:                     )}\r\
54:                     <div className=\"message-content\" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>\r\
55:                     {msg.created_at && (\r\
56:                         <div className=\"message-timestamp\" data-testid=\"msg-timestamp\" style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: isUser ? 'right' : 'left', marginTop: '4px' }}>\r\
57:                             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\r\
58:                         </div>\r\
59:                     )}\r\
60:                     {msg.metrics && !isRegularUser && (\r\
61:                         <div className=\"message-meta\">\r\
62:                             {msg.metrics.input_tokens !== undefined ? (\r\
63:                                 <>\r\
64:                                     <span className=\"meta-pill input-tokens-pill\" title=\"Tokens de Entrada (Contexto + Prompt)\">\r\
65:                                         📥 {msg.metrics.input_tokens.toLocaleString()} IN\r\
66:                                     </span>\r\
67:                                     <span className=\"meta-pill output-tokens-pill\" title=\"Tokens de Saída (Resposta da IA)\">\r\
68:                                         📤 {msg.metrics.output_tokens.toLocaleString()} OUT\r\
69:                                     </span>\r\
70:                                     <span className=\"meta-pill tokens-pill total\" title=\"Total de Tokens consumidos\">\r\
71:                                         ⚡ {msg.metrics.tokens.toLocaleString()} TOTAL\r\
72:                                     </span>\r\
73:                                     {msg.metrics.cost !== undefined && (\r\
74:                                         <span className=\"meta-pill cost-pill\" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }} title=\"Custo estimado desta resposta em BRL\">\r\
75:                                             💰 R$ {msg.metrics.cost.toFixed(2)}\r\
76:                                         </span>\r\
77:                                     )}\r\
78:                                     {msg.metrics.response_time_ms !== undefined && (\r\
79:                                         <span className=\"meta-pill time-pill\" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }} title=\"Tempo total de processamento\">\r\
80:                                             ⏱️ {(msg.metrics.response_time_ms / 1000).toFixed(2)}s\r\
81:                                         </span>\r\
82:                                     )}\r\
83:                                 </>\r\
84:                             ) : (\r\
85:                                 <>\r\
86:                                     <span className=\"meta-pill tokens-pill\">⚡ {msg.metrics.tokens.toLocaleString()} toks</span>\r\
87:                                     {msg.metrics.cost !== undefined && (\r\
88:                                         <span className=\"meta-pill cost-pill\" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>\r\
89:                                             💰 R$ {msg.metrics.cost.toFixed(2)}\r\
90:                                         </span>\r\
91:                                     )}\r\
92:                                 </>\r\
93:                             )}\r\
94: \r\
95:                             {msg.model_used && (\r\
96:                                 <span className=\"meta-pill model-pill\" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>\r\
97:                                     ✨ {msg.model_used}\r\
98:                                 </span>\r\
99:                             )}\r\
100:                             {msg.metrics?.model_role && (\r\
101:                                 <span className=\"meta-pill\" style={{\r\
102:                                     background: msg.metrics.model_role === 'main' ? 'rgba(16, 185, 129, 0.15)' :\r\
103:                                         msg.metrics.model_role === 'fallback' ? 'rgba(234, 179, 8, 0.15)' :\r\
104:                                             'rgba(239, 68, 68, 0.15)',\r\
105:                                     color: msg.metrics.model_role === 'main' ? '#10b981' :\r\
106:                                         msg.metrics.model_role === 'fallback' ? '#eab308' :\r\
107:                                             '#ef4444',\r\
108:                                     display: 'flex', alignItems: 'center', gap: '4px',\r\
109:                                     fontWeight: 600\r\
110:                                 }}>\r\
111:                                     {msg.metrics.model_role === 'main' ? '🟢 Principal' :\r\
112:                                         msg.metrics.model_role === 'fallback' ? '🟡 Fallback' :\r\
113:                                             '🔴 Emergência'}\r\
114:                                 </span>\r\
115:                             )}\r\
116:                             {msg.tool_calls && msg.tool_calls.length > 0 && (\r\
117:                                 <span className=\"meta-pill tool-pill\" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} title=\"Ferramentas externas foram utilizadas\">\r\
118:                                     🛠️ Tools\r\
119:                                 </span>\r\
120:                             )}\r\
121: \r\
122:                             {msg.debug?.guardrails_active && (\r\
123:                                 <span className=\"meta-pill guardrail-pill active\" title=\"Políticas de segurança aplicadas\">🛡️ Seguro</span>\r\
124:                             )}\r\
125:                             {msg.violations && (\r\
126:                                 <span className=\"meta-pill guardrail-pill danger\">🚫 Filtrado</span>\r\
127:                             )}\r\
128:                             {!isUser && msg.debug && (\r\
129:                                 <button onClick={() => {\r\
130:                                     setShowDebug(!showDebug);\r\
131:                                 }} className={`debug-toggle-btn ${showDebug ? 'active' : ''}`}>\r\
132:                                     {showDebug ? 'Ocultar Detalhes' : '🔍 Raio-X'}\r\
133:                                 </button>\r\
134:                             )}\r\
135: \r\
136:                             {/* ---- Botões de Feedback ---- */}\r\
137:                             {canFeedback && (\r\
138:                                 <div className=\"feedback-btns\">\r\
139:                                     {!fbState && (\r\
140:                                         <>\r\
141:                                             <button\r\
142:                                                 className=\"feedback-btn thumbs-up\"\r\
143:                                                 onClick={() => handleThumbsUp(msg, msgIndex)}\r\
144:                                                 title=\"Resposta correta — adicionar ao dataset\"\r\
145:                                             >👍</button>\r\
146:                                             <button\r\
147:                                                 className=\"feedback-btn thumbs-down\"\r\
148:                                                 onClick={() => handleThumbsDown(msg, msgIndex)}\r\
149:                                                 title=\"Resposta ruim — corrigir para treinar\"\r\
150:                                             >👎</button>\r\
151:                                         </>\r\
152:                                     )}\r\
153:                                     {fbState === 'positive' && (\r\
154:                                         <span className=\"feedback-done positive\" title=\"Feedback positivo salvo!\">✅ Salvo</span>\r\
155:                                     )}\r\
156:                                     {(fbState === 'negative') && (\r\
157:                                         <span className=\"feedback-done negative\" title=\"Correção salva no dataset\">🎯 Corrigido</span>\r\
158:                                     )}\r\
159:                                     {fbState === 'correcting' && (\r\
160:                                         <span className=\"feedback-done correcting\">✏️ Corrigindo...</span>\r\
161:                                     )}\r\
162:                                 </div>\r\
163:                             )}\r\
164:                         </div>\r\
165:                     )}\r\
166:                     {showDebug && (\r\
167:                         msg.debug ? (\r\
168:                             <div className=\"debug-panel\">\r\
169:                                 <h5 style={{ margin: '0 0 10px 0', color: '#fbbf24' }}>🧠 Raio-X do Pensamento</h5>\r\
170:                                 <TimelineView debug={msg.debug} />\r\
171:                                 {msg.debug.rag_items && msg.debug.rag_items.length > 0 ? (\r\
172:                                     <div className=\"debug-section\">\r\
173:                                         <strong>📚 Fontes Recuperadas (RAG):</strong>\r\
174:                                         <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>\r\
175:                                             {msg.debug.rag_items.map((item, i) => (\r\
176:                                                 <div key={i} style={{\r\
177:                                                     background: 'rgba(255,255,255,0.05)',\r\
178:                                                     padding: '8px',\r\
179:                                                     borderRadius: '6px',\r\
180:                                                     fontSize: '0.8rem',\r\
181:                                                     borderLeft: '3px solid #6366f1'\r\
182:                                                 }}>\r\
183:                                                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>\r\
184:                                                         <span style={{ color: '#818cf8', fontWeight: 'bold' }}>#{i + 1} {item.category}</span>\r\
185:                                                         {item.metadata?.page && (\r\
186:                                                             <span style={{\r\
187:                                                                 background: '#6366f1',\r\
188:                                                                 color: 'white',\r\
189:                                                                 padding: '1px 6px',\r\
190:                                                                 borderRadius: '4px',\r\
191:                                                                 fontSize: '0.7rem'\r\
192:                                                             }}>Pág. {item.metadata.page}</span>\r\
193:                                                         )}\r\
194:                                                         {item.relevance_score !== undefined && (\r\
195:                                                             <span style={{\r\
196:                                                                 background: 'rgba(16, 185, 129, 0.2)',\r\
197:                                                                 color: '#4ade80',\r\
198:                                                                 border: '1px solid rgba(16, 185, 129, 0.2)',\r\
199:                                                                 padding: '1px 6px',\r\
200:                                                                 borderRadius: '4px',\r\
201:                                                                 fontSize: '0.7rem',\r\
202:                                                                 fontWeight: 'bold'\r\
203:                                                             }}>🎯 Relevância: {item.relevance_score.toFixed(3)}</span>\r\
204:                                                         )}\r\
205:                                                     </div>\r\
206:                                                     <div style={{ color: '#e2e8f0', marginBottom: '2px' }}><strong>P:</strong> {item.question}</div>\r\
207:                                                     <div style={{ color: '#94a3b8' }}><strong>R:</strong> {item.answer.substring(0, 150)}...</div>\r\
208:                                                 </div>\r\
209:                                             ))}\r\
210:                                         </div>\r\
211:                                     </div>\r\
212:                                 ) : msg.debug.rag_context && (\r\
213:                                     <div className=\"debug-section\">\r\
214:                                         <strong>📚 RAG Context (Legado):</strong>\r\
215:                                         <pre>{msg.debug.rag_context}</pre>\r\
216:                                     </div>\r\
217:                                 )}\r\
218:                                 {msg.debug.pre_router && (\r\
219:                                     <div className=\"debug-section\" style={{ borderLeft: '3px solid #fbbf24', paddingLeft: '10px' }}>\r\
220:                                         <strong style={{ color: '#fbbf24' }}>🧠 Decisão do Pre-Router</strong>\r\
221:                                         <div style={{ marginTop: '8px' }}>\r\
222:                                             <pre style={{ \r\
223:                                                 fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '10px', \r\
224:                                                 borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' \r\
225:                                             }}>\r\
226:                                                 {JSON.stringify(\r\
227:                                                     Object.fromEntries(Object.entries(msg.debug.pre_router).filter(([k]) => !k.startsWith('_'))), \r\
228:                                                     null, 2\r\
229:                                                 )}\r\
230:                                             </pre>\r\
231:                                             {msg.debug.pre_router._debug_prompt && (\r\
232:                                                 <details style={{ marginTop: '10px' }}>\r\
233:                                                     <summary style={{ fontSize: '0.75rem', color: '#fbbf24', cursor: 'pointer', fontWeight: 'bold' }}>\r\
234:                                                         📄 Ver Prompt do Pre-Router\r\
235:                                                     </summary>\r\
236:                                                     <pre style={{ \r\
237:                                                         fontSize: '0.7rem', background: 'rgba(0,0,0,0.5)', padding: '10px', \r\
238:                                                         borderRadius: '8px', marginTop: '5px', maxHeight: '200px', overflowY: 'auto'\r\
239:                                                     }}>\r\
240:                                                         {msg.debug.pre_router._debug_prompt}\r\
241:                                                     </pre>\r\
242:                                                 </details>\r\
243:                                             )}\r\
244:                                         </div>\r\
245:                                     </div>\r\
246:                                 )}\r\
247: \r\
248:                                 {msg.debug.resolved_prompt && (\r\
249:                                     <div className=\"debug-section\" style={{ borderLeft: '3px solid #4ade80', paddingLeft: '10px' }}>\r\
250:                                         <strong style={{ color: '#4ade80' }}>📝 Prompt Final do Sistema</strong>\r\
251:                                         <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>\r\
252:                                             Este é o texto exato enviado à IA (incluindo Regras, Contexto RAG e Memória).\r\
253:                                         </p>\r\
254:                                         <pre style={{ \r\
255:                                             fontSize: '0.75rem', background: 'rgba(16,185,129,0.05)', padding: '12px', \r\
256:                                             borderRadius: '10px', border: '1px solid rgba(16,185,129,0.1)',\r\
257:                                             maxHeight: '400px', overflowY: 'auto', color: '#94a3b8'\r\
258:                                         }}>\r\
259:                                             {msg.debug.resolved_prompt}\r\
260:                                         </pre>\r\
261:                                     </div>\r\
262:                                 )}\r\
263: \r\
264:                                 {msg.debug.translation && (\r\
265:                                     <div className=\"debug-section\" style={{ borderLeft: '3px solid #6366f1', paddingLeft: '10px' }}>\r\
266:                                         <strong style={{ color: '#a5b4fc' }}>🌐 Tradução Automática</strong>\r\
267:                                         <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>\r\
268:                                             <span>\r\
269:                                                 {msg.debug.translation.used_fallback\r\
270:                                                     ? <span style={{ color: '#f59e0b' }}>⚠️ Idioma não detectado — usou idioma de fallback: <strong>{msg.debug.translation.target_lang}</strong></span>\r\
271:                                                     : <span style={{ color: '#4ade80' }}>✅ Idioma detectado: <strong>{msg.debug.translation.detected_lang}</strong> → traduzido para <strong>{msg.debug.translation.target_lang}</strong></span>\r\
272:                                                 }\r\
273:                                             </span>\r\
274:                                             <span style={{ color: '#64748b' }}>Modelo de tradução: {msg.debug.translation.model}</span>\r\
275:                                         </div>\r\
276:                                     </div>\r\
277:                                 )}\r\
278:                                 {msg.debug.error && (\r\
279:                                     <div className=\"debug-section\" style={{ color: '#f87171' }}>\r\
280:                                         <strong>❌ Erro Interno:</strong>\r\
281:                                         <pre>{msg.debug.error}</pre>\r\
282:                                     </div>\r\
283:                                 )}\r\
284:                             </div>\r\
285:                         ) : (\r\
286:                             <div className=\"debug-panel\">\r\
287:                                 <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>\r\
288:                                     ⚠️ Dados de Raio-X não disponíveis para esta mensagem.\r\
289:                                 </p>\r\
290:                             </div>\r\
291:                         )\r\
292:                     )}\r\
293:                 </div>\r\
294:                 {isUser && <div className=\"avatar user-avatar\">👤</div>}\r\
295:             </div>\r\
296:         </>\r\
297:     );\r\
298: };\r\
299: \r\
300: export default MessageBubble