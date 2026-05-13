import json
import logging
from sqlalchemy import select
from database.connection import async_session

logger = logging.getLogger(__name__)

async def seed_native_tools():
    """Garante que as ferramentas nativas existam no catálogo."""
    from models import ToolModel # Import local para evitar circular dependency
    
    NATIVE_TOOLS = [
        {
            "name": "google_calendar_criar_evento",
            "description": "Cria um novo evento no Google Calendar do usuário. Use quando o usuário pedir para agendar, marcar ou criar um compromisso, reunião ou tarefa. Suporta cor personalizada, convidados por e-mail e recorrência (semanal, mensal, etc).",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "titulo": {"type": "string", "description": "Título do evento (Ex: Reunião de Alinhamento)"},
                    "inicio": {"type": "string", "description": "Data/hora de início no formato ISO (Ex: 2024-10-25T09:00:00-03:00)"},
                    "fim": {"type": "string", "description": "Data/hora de fim no formato ISO"},
                    "descricao": {"type": "string", "description": "Descrição detalhada do evento"},
                    "convidados": {"type": "string", "description": "Lista de e-mails separados por vírgula"},
                    "cor": {"type": "string", "description": "Nome da cor (vermelho, azul, verde, etc)"}
                },
                "required": ["titulo", "inicio", "fim"]
            })
        },
        {
            "name": "google_calendar_listar_eventos",
            "description": "Lista os próximos eventos ou busca compromissos passados no Google Calendar do usuário.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "max_resultados": {"type": "integer", "description": "Quantidade máxima de eventos (padrão 10)"},
                    "data_inicio": {"type": "string", "description": "ISO format string para filtrar início"},
                    "data_fim": {"type": "string", "description": "ISO format string para filtrar fim"}
                }
            })
        },
        {
            "name": "google_calendar_cancelar_evento",
            "description": "Remove um evento do Google Calendar usando o seu ID.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "event_id": {"type": "string", "description": "ID único do evento a ser removido"}
                },
                "required": ["event_id"]
            })
        },
        {
            "name": "transferir_suporte_humano",
            "description": "Transfere o atendimento para um especialista humano. Use quando o usuário pedir para falar com um atendente, suporte, ou quando você não conseguir resolver o problema.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "motivo": {"type": "string", "description": "Breve motivo da transferência"}
                }
            })
        },
        {
            "name": "transferir_robo",
            "description": "Retorna o atendimento para a automação do robô. Use quando o atendimento humano terminar ou o usuário pedir para voltar ao menu automático.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {}
            })
        },
        {
            "name": "internal_date_calculator",
            "description": "Calcula datas relativas (ex: 'próxima segunda', 'daqui a 3 dias') baseando-se na data atual.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "date_description": {"type": "string", "description": "Descrição da data (ex: próxima quinta)"}
                },
                "required": ["date_description"]
            })
        },
        {
            "name": "registrar_duvida_sem_resposta",
            "description": "Chame esta ferramenta quando o conhecimento disponível não for suficiente para responder à dúvida do usuário. Isso notificará a equipe humana.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "pergunta": {"type": "string", "description": "A pergunta exata do usuário"}
                },
                "required": ["pergunta"]
            })
        }
    ]

    async with async_session() as session:
        for tool_data in NATIVE_TOOLS:
            existing_result = await session.execute(select(ToolModel).where(ToolModel.name == tool_data["name"]))
            existing = existing_result.scalars().first()
            
            if not existing:
                logger.info(f"🌱 Semeando ferramenta nativa: {tool_data['name']}")
                new_tool = ToolModel(**tool_data)
                session.add(new_tool)
        
        await session.commit()
