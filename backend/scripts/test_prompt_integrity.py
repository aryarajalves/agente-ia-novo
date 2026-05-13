import requests
import json

URL = "http://localhost:8002"

def test_prompt_integrity():
    print("\n[TEST] Validando integridade e não-resumo do prompt...")
    
    # Prompt longo com várias seções
    long_prompt = """# PERSONA
Você é um especialista.

# TOM DE VOZ
Direto.

# REGRAS E LIMITAÇÕES
1. Regra importante 1.
2. Regra importante 2.
3. Regra importante 3.
4. Regra importante 4.
5. Regra importante 5.

# CONTEXTO E INSTRUÇÕES GERAIS
Aqui temos um contexto muito longo que não deve ser apagado.
O preço do curso é R$ 497.
O suporte funciona das 08h às 18h.
O link de acesso é enviado por e-mail.
"""
    
    payload = {
        "agent_id": 100,
        "current_prompt": long_prompt,
        "messages": [
            {"role": "user", "content": "mude o preço para R$ 100"}
        ]
    }
    
    try:
        response = requests.post(f"{URL}/apply-suggestions", json=payload)
        if response.status_code != 200:
            print(f"Error: Status {response.status_code}")
            return
            
        data = response.json()
        new_prompt = data.get("prompt", "")
        
        # O novo prompt deve conter "R$ 100" mas TAMBÉM todas as outras regras
        has_new_price = "R$ 100" in new_prompt
        has_regra_5 = "Regra importante 5" in new_prompt
        has_suporte = "das 08h às 18h" in new_prompt
        
        orig_len = len(long_prompt.split('\n'))
        new_len = len(new_prompt.split('\n'))
        
        print(f"Linhas originais: {orig_len}")
        print(f"Linhas novas: {new_len}")
        
        if has_new_price and has_regra_5 and has_suporte and abs(orig_len - new_len) <= 5:
            print("SUCCESS: Prompt integrity preserved!")
        else:
            print("FAILED: Prompt was likely truncated or summarized.")
            print("--- RESULTING PROMPT ---")
            print(new_prompt)
            print("------------------------")
            if not has_new_price: print("- New price missing.")
            if not has_regra_5: print("- Rule 5 missing.")
            if not has_suporte: print("- Support info missing.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_prompt_integrity()
