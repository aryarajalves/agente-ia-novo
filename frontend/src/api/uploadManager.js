import { api } from './client';

class UploadManager {
    constructor() {
        const saved = localStorage.getItem('active_uploads');
        this.activeUploads = saved ? JSON.parse(saved) : [];
        this.listeners = [];
        
        // Marcar itens que ficaram presos em 'uploading' como erro
        // Adicionamos uma pequena carência (grace period): se o upload foi criado há menos de 10 segundos, 
        // talvez ainda esteja ok (ou sendo retomado pelo componente). 
        // Se for mais velho, provavelmente foi interrompido.
        const now = new Date().getTime();
        this.activeUploads = this.activeUploads.map(u => {
            if (u.status === 'uploading') {
                const created = new Date(u.created_at).getTime();
                if (now - created > 15000) { // 15 segundos de tolerância
                    return { ...u, status: 'error', error: 'Envio interrompido pelo navegador.' };
                }
            }
            return u;
        });
        
        // Limpar uploads concluídos antigos ao iniciar
        this.activeUploads = this.activeUploads.filter(u => u.status !== 'completed');

        // Deduplicar erros: Se o mesmo arquivo aparecer várias vezes como erro, mantemos apenas o mais recente
        const uniqueErrors = {};
        this.activeUploads = this.activeUploads.filter(u => {
            if (u.status !== 'error') return true;
            if (!uniqueErrors[u.filename] || new Date(u.created_at) > new Date(uniqueErrors[u.filename].created_at)) {
                uniqueErrors[u.filename] = u;
                return true;
            }
            return false;
        });
        // Filtrar novamente para remover os duplicados que não eram o mais recente
        this.activeUploads = this.activeUploads.filter(u => {
            if (u.status !== 'error') return true;
            return uniqueErrors[u.filename]?.id === u.id;
        });
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        localStorage.setItem('active_uploads', JSON.stringify(this.activeUploads));
        this.listeners.forEach(l => l([...this.activeUploads]));
        const hasActiveUploads = this.activeUploads.some(u => u.status === 'uploading');
        if (hasActiveUploads) {
            window.onbeforeunload = () => 'Upload em andamento. Se sair, o envio será cancelado. Deseja continuar?';
        } else {
            window.onbeforeunload = null;
        }
    }

    startUpload(kbId, file, config) {
        const uploadId = Math.random().toString(36).substring(7);
        const newUpload = {
            id: uploadId,
            filename: file.name,
            progress: 0,
            status: 'uploading',
            created_at: new Date().toISOString(),
            kb_id: kbId
        };

        this.activeUploads.push(newUpload);
        this.notify();

        const getUploadUrl = async () => {
            const body = { 
                filename: file.name,
                content_type: file.type || 'application/octet-stream'
            };
            if (kbId) { body.kb_id = kbId; }
            const res = await api.post('/knowledge-bases/generate-upload-url', body);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Falha ao solicitar autorização de upload');
            }
            return await res.json();
        };

        const doDirectUpload = (url, progressCallback) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', url);

                // IMPORTANTE: não colocar cabeçalhos proprietários aqui (ex: Authorization/X-API-Key)
                // O AWS S3/B2 recusa presigned URLs se enviarmos headers extras não assinados.

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        progressCallback(Math.round((e.loaded / e.total) * 100));
                    }
                });

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Falha no envio para o B2: ${xhr.status} ${xhr.responseText}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Erro de conexão ao enviar o vídeo diretamente para o S3. Verifique bloqueios de CORS do Bucket.'));

                xhr.send(file);
            });
        };

        const confirmUpload = async (taskId, s3Key) => {
            const res = await api.post('/knowledge-bases/confirm-upload', {
                task_id: taskId,
                kb_id: kbId || null,
                config: config
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Falha ao confirmar o envio no backend');
            }
        };

        const executeUploadFlow = async () => {
            try {
                // 1. Gera Link de Upload
                const { url, task_id, s3_key } = await getUploadUrl();
                
                // 2. Faz o Upload direto no S3 Bypass Cloudflare
                await doDirectUpload(url, (percent) => {
                    const upload = this.activeUploads.find(u => u.id === uploadId);
                    if (upload) {
                        upload.progress = percent;
                        this.notify();
                    }
                });

                // 3. Avisa o backend que terminou com a config
                await confirmUpload(task_id, s3_key);

                // 4. Finaliza localmente
                const upload = this.activeUploads.find(u => u.id === uploadId);
                if (upload) {
                    upload.status = 'completed';
                    setTimeout(() => { this.removeUpload(uploadId); }, 3000);
                }
            } catch (err) {
                const upload = this.activeUploads.find(u => u.id === uploadId);
                if (upload) {
                    upload.status = 'error';
                    upload.error = err.message || 'Erro desconhecido';
                    this.notify();
                }
            }
        };

        // Inicia o fluxo sem prender a UI
        executeUploadFlow();

        return uploadId;
    }

    removeUpload(id) {
        this.activeUploads = this.activeUploads.filter(u => u.id !== id);
        this.notify();
    }

    clearAllErrors() {
        this.activeUploads = this.activeUploads.filter(u => u.status !== 'error');
        this.notify();
    }

    getActiveUploads() {
        return [...this.activeUploads];
    }
}

export const uploadManager = new UploadManager();
