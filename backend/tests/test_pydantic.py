from config_store import AgentConfig
a = AgentConfig(name="Teste", initial_message="hello")
print(a.initial_message)
print(a.model_dump() if hasattr(a, 'model_dump') else a.dict())
