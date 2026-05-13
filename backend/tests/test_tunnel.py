import os
import pytest
from dotenv import load_dotenv

def test_cloudflare_tunnel_variable():
    """
    Testa se a variável do Cloudflare Tunnel está presente no .env
    e se a do Ngrok foi removida.
    """
    # Recarrega o .env para garantir que estamos pegando a versão mais recente
    load_dotenv(override=True)
    
    # Verifica presença das novas variáveis
    tunnel_token = os.getenv("CLOUDFLARE_TUNNEL_TOKEN")
    assert tunnel_token is not None, "A variável CLOUDFLARE_TUNNEL_TOKEN não foi encontrada no ambiente."
    
    tunnel_url = os.getenv("CLOUDFLARE_TUNNEL_URL")
    assert tunnel_url is not None, "A variável CLOUDFLARE_TUNNEL_URL não foi encontrada no ambiente."
    assert tunnel_url.startswith("https://"), "A variável CLOUDFLARE_TUNNEL_URL deve começar com https://"
    
    # Verifica ausência da variável antiga
    ngrok_token = os.getenv("NGROK_AUTHTOKEN")
    assert ngrok_token is None, "A variável NGROK_AUTHTOKEN ainda está presente no ambiente."

def test_docker_compose_tunnel_config():
    """
    Verifica se o arquivo docker-compose-local.yml contém o serviço do Cloudflare 
    e não contém mais o do Ngrok.
    """
    docker_compose_path = "docker/docker-compose-local.yml"
    assert os.path.exists(docker_compose_path), "Arquivo docker-compose-local.yml não encontrado."
    
    with open(docker_compose_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    assert "cloudflare-tunnel:" in content, "Serviço cloudflare-tunnel não encontrado no docker-compose-local.yml"
    assert "ngrok:" not in content, "Serviço ngrok ainda presente no docker-compose-local.yml"
    assert "TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}" in content, "Mapeamento do token do túnel incorreto no docker-compose."

if __name__ == "__main__":
    try:
        test_cloudflare_tunnel_variable()
        print("[OK] test_cloudflare_tunnel_variable: PASSED")
        test_docker_compose_tunnel_config()
        print("[OK] test_docker_compose_tunnel_config: PASSED")
    except AssertionError as e:
        print(f"[ERROR] Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        exit(1)
