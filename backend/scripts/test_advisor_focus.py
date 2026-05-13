import requests
import json

URL = "http://localhost:8002"

def test_targeted_hallucination():
    print("\n[TEST] Validando foco do Advisor em 'Alteração de Preço'...")
    
    payload = {
        "agent_id": 100,
        "current_prompt": "O preço do curso é R$ 497,00 e pode ser parcelado em 12x.",
        "messages": [
            {"role": "user", "content": "como consigo alterar o preço do curso?"}
        ]
    }
    
def test_advisor_rigidity():
    print("\n[TEST] Validando rigidez e referência de linhas...")
    
    payload = {
        "agent_id": 100,
        "current_prompt": "1: Regra 1\n2: O preço do curso é R$ 497\n3: Regra 3",
        "messages": [
            {"role": "user", "content": "mude o preço para R$ 100"}
        ]
    }
    
    try:
        response = requests.post(f"{URL}/prompt-chat", json=payload)
        if response.status_code != 200:
            print(f"Error: Status {response.status_code}")
            return
            
        data = response.json()
        content = data.get("content", "")
        
        print(f"Advisor Response: {content.encode('ascii', 'ignore').decode('ascii')}")
        
        # Deve ter o padrão Antes/Depois
        has_before = "texto atual " in content.lower() or "atual " in content.lower()
        has_after = "vou alterar para" in content.lower()
        has_button_instr = "clique em" in content.lower()
        
        if has_before and has_after and has_button_instr:
            print("SUCCESS: Advisor follows Before/After pattern!")
        else:
            if not has_before: print("FAILED: Advisor didn't show current text.")
            if not has_after: print("FAILED: Advisor didn't show proposed text.")
            if not has_button_instr: print("FAILED: Advisor didn't mention the button.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_advisor_rigidity()
