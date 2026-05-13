import os
import sys

def check_no_localhost_in_critical_urls():
    """
    Verifica se variáveis críticas de URL não contêm 'localhost' em ambiente de produção/túnel.
    """
    critical_vars = ["BACKEND_URL", "VITE_API_URL", "GOOGLE_REDIRECT_URI"]
    env_path = os.path.join(os.getcwd(), ".env")
    
    if not os.path.exists(env_path):
        print(f"[ERRO] Arquivo .env não encontrado em {env_path}")
        return False
    
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    errors = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
            
        if "=" in line:
            parts = line.split("=", 1)
            if len(parts) == 2:
                key, value = parts
                if key in critical_vars:
                    if "localhost" in value.lower():
                        errors.append(f"Variável {key} contém 'localhost': {value}")
    
    if errors:
        for err in errors:
            print(f"[ERRO] {err}")
        return False
    
    print("[OK] Nenhuma variável crítica contém 'localhost' no .env.")
    return True

def check_frontend_config_no_localhost():
    """
    Verifica se os arquivos de configuração do frontend não têm localhost hardcoded.
    """
    frontend_config_src = os.path.join(os.getcwd(), "frontend", "src", "config.js")
    frontend_config_pub = os.path.join(os.getcwd(), "frontend", "public", "config.js")

    success = True
    
    if os.path.exists(frontend_config_src):
        with open(frontend_config_src, "r", encoding="utf-8") as f:
            content = f.read()
            if 'getEnv("VITE_API_URL", "http://localhost' in content:
                print("[ERRO] Frontend src/config.js ainda usa localhost como fallback")
                success = False
            else:
                print("[OK] Frontend src/config.js está correto.")
    else:
        print(f"[AVISO] Arquivo {frontend_config_src} não encontrado.")

    if os.path.exists(frontend_config_pub):
        with open(frontend_config_pub, "r", encoding="utf-8") as f:
            content = f.read()
            if "localhost" in content.lower():
                print("[ERRO] Frontend public/config.js ainda contém localhost")
                success = False
            else:
                print("[OK] Frontend public/config.js está correto.")
    else:
        print(f"[AVISO] Arquivo {frontend_config_pub} não encontrado.")

    return success

if __name__ == "__main__":
    v1 = check_no_localhost_in_critical_urls()
    v2 = check_frontend_config_no_localhost()
    
    if not v1 or not v2:
        print("\n[FALHA] Localhost detectado em configurações críticas!")
        sys.exit(1)
    else:
        print("\n[SUCESSO] Configurações validadas para o Túnel Cloudflare.")
        sys.exit(0)
