const fs = require('fs');
const path = require('path');

const cssPath = 'frontend/src/index.css';
if (!fs.existsSync(cssPath)) {
    console.error('index.css not found');
    process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8');

// Definição de para onde vai cada classe/seção
const mapping = [
    { name: 'Dashboard', patterns: ['.dashboard', '.agent-card', '.stat-card', '.stat-', '.filter-bar', '.search-wrapper', '.create-agent-btn', '.tab-switcher', '.modern-'] },
    { name: 'Sidebar', patterns: ['.sidebar', '.nav-item', '.logo-section', '.user-profile-mini', '.sidebar-footer'] },
    { name: 'ChatPlayground', patterns: ['.chat-playground', '.chat-messages', '.chat-bubble', '.chat-input', '.message-input', '.sentiment-'] },
    { name: 'WebhookManager', patterns: ['.webhook', '.leads-modal', '.pipeline-', '.bulk-toolbar', '.filter-pill'] },
    { name: 'IntegrationsPanel', patterns: ['.integrations', '.guide-btn', '.google-card', '.whatsapp-card'] },
    { name: 'FineTuning', patterns: ['.ft-', '.fine-tuning', '.pipeline-step'] },
    { name: 'UserManagement', patterns: ['.user-management', '.users-table', '.user-row', '.badge-'] },
    { name: 'ConfirmModal', patterns: ['.confirm-modal', '.modal-overlay', '.modal-content'] },
    { name: 'ConfigPanel', patterns: ['.config-panel', '.form-section', '.form-group', '.save-button'] }
];

const lines = css.split('\n');
const modules = {};
mapping.forEach(m => modules[m.name] = []);
const base = [];

let currentModule = null;
let braceLevel = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.includes('{')) braceLevel++;
    
    // Se estivermos no nível 0 e a linha começar uma regra, tentamos identificar o módulo
    if (braceLevel === 1 && !currentModule) {
        for (const m of mapping) {
            if (m.patterns.some(p => trimmed.toLowerCase().includes(p.toLowerCase()))) {
                currentModule = m.name;
                break;
            }
        }
    }

    if (currentModule) {
        modules[currentModule].push(line);
    } else {
        base.push(line);
    }

    if (trimmed.includes('}')) {
        braceLevel--;
        if (braceLevel === 0) currentModule = null;
    }
}

// Salvar Base.css
const baseDir = 'frontend/src/styles';
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
fs.writeFileSync(path.join(baseDir, 'Base.css'), base.join('\n'));

// Salvar Módulos
Object.entries(modules).forEach(([name, content]) => {
    if (content.length === 0) return;
    const dir = `frontend/src/components/${name}/styles`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.css`), content.join('\n'));
});

console.log('Stabilization complete');
