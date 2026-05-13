import boto3
import os
from botocore.config import Config
from botocore.exceptions import ClientError

def test_s3():
    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    access_key = os.getenv("S3_ACCESS_KEY")
    secret_key = os.getenv("S3_SECRET_KEY")
    bucket_name = os.getenv("S3_BUCKET_NAME")
    region = os.getenv("S3_REGION", "us-east-005")

    print(f"--- DIAGNÓSTICO S3 ---")
    print(f"Endpoint: {endpoint_url}")
    print(f"Bucket: {bucket_name}")
    print(f"Region: {region}")
    
    if not all([endpoint_url, access_key, secret_key, bucket_name]):
        print("ERRO: Faltam variáveis de ambiente!")
        return

    try:
        s3 = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version='s3v4')
        )

        # 1. Teste de Listagem
        print("\n1. Testando Listagem de Objetos...")
        try:
            response = s3.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
            print("   [OK] Conexão estabelecida e bucket acessível.")
        except ClientError as e:
            print(f"   [FALHA] Erro de autorização ou acesso: {e}")
            return

        # 2. Teste de Upload
        print("\n2. Testando Upload de arquivo pequeno...")
        test_content = b"Teste de Conexao S3 ZapVoice"
        test_key = "test_connection.txt"
        try:
            s3.put_object(Bucket=bucket_name, Key=test_key, Body=test_content)
            print(f"   [OK] Arquivo '{test_key}' enviado com sucesso.")
        except ClientError as e:
            print(f"   [FALHA] Erro de escrita no bucket: {e}")
            return

        # 3. Teste de Deleção
        print("\n3. Testando Deleção do arquivo de teste...")
        try:
            s3.delete_object(Bucket=bucket_name, Key=test_key)
            print(f"   [OK] Arquivo removido com sucesso.")
        except ClientError as e:
            print(f"   [AVISO] Falha ao remover arquivo de teste: {e}")

        print("\n--- RESULTADO FINAL: SUCESSO ---")
        print("Sua configuração do Backblaze B2 está 100% operacional.")

    except Exception as e:
        print(f"\n--- RESULTADO FINAL: ERRO CRÍTICO ---")
        print(f"Erro inesperado: {str(e)}")

if __name__ == "__main__":
    test_s3()
