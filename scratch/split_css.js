const fs = require('fs');
const path = require('path');

const css = fs.readFileSync('frontend/src/index.css', 'utf8');
const lines = css.split('\n');

const modules = {
    'Base': [],
    'Sidebar': [],
    'Dashboard': [],
    'ChatPlayground': [],
    'WebhookManager': [],
    'IntegrationsPanel': [],
    'FineTuning': [],
    'UserManagement': [],
    'Login': [],
    'ConfirmModal': []
};

let currentModule = 'Base';

for (const line of lines) {
    const l = line.toLowerCase();
    
    // Só muda de módulo se a linha começar com uma classe ou comentário de seção
    // E não estivermos dentro de :root (simplificado: se a linha tiver um '{' e não for :root)
    if (line.includes('{') && !line.includes(':root')) {
        if (l.includes('.sidebar') || l.includes('.nav-')) currentModule = 'Sidebar';
        else if (l.includes('.dashboard') || l.includes('.agent-card')) currentModule = 'Dashboard';
        else if (l.includes('.chat-playground') || l.includes('.chat-messages') || l.includes('.chat-bubble')) currentModule = 'ChatPlayground';
        else if (l.includes('.webhook') || l.includes('.leads-modal') || l.includes('.pipeline-')) currentModule = 'WebhookManager';
        else if (l.includes('.integrations') || l.includes('.guide-step')) currentModule = 'IntegrationsPanel';
        else if (l.includes('.ft-')) currentModule = 'FineTuning';
        else if (l.includes('.user-management')) currentModule = 'UserManagement';
        else if (l.includes('.login')) currentModule = 'Login';
        else if (l.includes('.confirm-modal') || l.includes('.modal-overlay') || l.includes('.modal-content')) currentModule = 'ConfirmModal';
    }
    
    modules[currentModule].push(line);
}

// Salvar arquivos
Object.entries(modules).forEach(([name, content]) => {
    const dir = name === 'Base' ? 'frontend/src/styles' : `frontend/src/components/${name}/styles`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.css`), content.join('\n'));
});

console.log('Split complete');
const stats = Object.entries(modules).map(([n, c]) => `${n}: ${c.length} lines`).join(', ');
console.log('Stats: ' + stats);
