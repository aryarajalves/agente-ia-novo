from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- AUTH & USER SCHEMAS ---

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    name: str = "Novo Usuário"
    email: str
    password: str
    role: str = "Usuário"
    status: str = "ATIVO"
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    company_logo_size: Optional[str] = "medium"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    company_logo_size: Optional[str] = None

# --- KNOWLEDGE BASE SCHEMAS ---

class KnowledgeItem(BaseModel):
    id: Optional[int] = None
    question: str
    answer: str
    metadata_val: Optional[str] = None
    category: Optional[str] = "Geral"
    source_metadata: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class KnowledgeBase(BaseModel):
    id: Optional[int] = None
    name: str = "Nova Base"
    description: Optional[str] = None
    kb_type: str = "qa"
    question_label: str = "Pergunta"
    answer_label: str = "Resposta"
    metadata_label: str = "Metadado"
    items: List[KnowledgeItem] = []
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- AGENT & CONFIG SCHEMAS ---

class AgentConfig(BaseModel):
    id: Optional[int] = None
    name: str = "Novo Agente"
    description: Optional[str] = None
    model: str = "gpt-5.2"
    fallback_model: Optional[str] = None
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    top_k: Optional[int] = 40
    presence_penalty: Optional[float] = 0.0
    frequency_penalty: Optional[float] = 0.0
    safety_settings: Optional[str] = "standard"
    model_settings: Dict[str, Any] = {}
    is_active: bool = True
    date_awareness: bool = False
    system_prompt: str = "Você é um assistente útil e inteligente."
    context_window: int = 5
    knowledge_base: list = []
    knowledge_base_id: Optional[int] = None
    knowledge_base_ids: List[int] = []
    rag_retrieval_count: int = 5
    rag_translation_enabled: bool = False
    rag_multi_query_enabled: bool = False
    rag_rerank_enabled: bool = True
    rag_agentic_eval_enabled: bool = True
    rag_parent_expansion_enabled: bool = True
    tool_ids: List[int] = []
    simulated_time: Optional[str] = None
    security_competitor_blacklist: Optional[str] = None
    security_forbidden_topics: Optional[str] = None
    security_discount_policy: Optional[str] = None
    security_language_complexity: str = "standard"
    security_pii_filter: bool = False
    security_validator_ia: bool = False
    security_bot_protection: bool = False
    security_max_messages_per_session: int = 20
    security_semantic_threshold: float = 0.85
    security_loop_count: int = 3
    ui_primary_color: str = "#6366f1"
    ui_header_color: str = "#0f172a"
    ui_chat_title: str = "Suporte Inteligente"
    ui_welcome_message: str = "Olá! Como posso te ajudar hoje?"
    initial_message: Optional[str] = None
    initial_question_message: Optional[str] = None
    initial_ignore_message: Optional[str] = None
    inbox_capture_enabled: bool = True
    router_enabled: bool = False
    router_simple_model: str = "gpt-5-mini"
    router_simple_fallback_model: Optional[str] = None
    router_complex_model: str = "gpt-5.2"
    router_complex_fallback_model: Optional[str] = None
    handoff_enabled: bool = False
    response_translation_enabled: bool = False
    response_translation_fallback_lang: str = "portuguese"
    model_config = ConfigDict(from_attributes=True)

class MessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    agent_id: Optional[int] = None
    context_variables: Optional[Dict[str, Any]] = None
    model_override: Optional[str] = None
    system_prompt_override: Optional[str] = None
    image_url: Optional[str] = None

class MessageResponse(BaseModel):
    response: str
    cost_usd: float
    cost_brl: float
    input_tokens: int
    output_tokens: int
    tool_calls: Optional[List[Dict[str, Any]]] = None
    audio: Optional[str] = None
    handoff_data: Optional[Dict[str, Any]] = None
    debug: Optional[Dict[str, Any]] = None
    response_time_ms: Optional[int] = None
    model_used: Optional[str] = None
    error: bool = False

class ToolCreate(BaseModel):
    name: str
    description: str
    parameters_schema: str  # JSON string
    webhook_url: Optional[str] = None
    labels_to_add: Optional[str] = None  # JSON list
    labels_to_remove: Optional[str] = None  # JSON list
    confirmation_message: Optional[str] = None

class ToolResponse(ToolCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PromptDraft(BaseModel):
    id: Optional[int] = None
    agent_id: Optional[int] = None
    prompt_text: str
    version_name: Optional[str] = None
    description: Optional[str] = None
    character_count: Optional[int] = 0
    token_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class GlobalContextVariable(BaseModel):
    id: Optional[int] = None
    key: str
    value: Optional[str] = None
    type: Optional[str] = "string"
    description: Optional[str] = None
    is_default: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)

# --- MEDIA & TRANSCRIPTION SCHEMAS ---

class TranscriptionProcessRequest(BaseModel):
    text: str
    config: Dict[str, Any]

class BulkDeleteTranscriptionRequest(BaseModel):
    task_ids: List[int]

class TranscriptionRenameRequest(BaseModel):
    filename: str

class TranscriptionFolderRequest(BaseModel):
    name: str

class TranscriptionMoveRequest(BaseModel):
    folder_id: Optional[int] = None

class ManualTranscriptionRequest(BaseModel):
    filename: str
    text: str
    folder_id: Optional[int] = None

class TranscriptionContentUpdateRequest(BaseModel):
    text: str

# --- KNOWLEDGE BASE SCHEMAS ---

class BatchUpdateRequest(BaseModel):
    item_ids: List[int]
    question: Optional[str] = None
    answer: Optional[str] = None
    metadata_val: Optional[str] = None
    category: Optional[str] = None

class BatchDeleteRequest(BaseModel):
    item_ids: List[int]

class BulkSummarizeRequest(BaseModel):
    item_ids: List[int]
    question: str
    metadata_val: str
    category: str = "Geral"

class AnswerToPromptRequest(BaseModel):
    agent_id: int
    answer: str
    question: Optional[str] = None

# --- ANALYTICS SCHEMAS ---

class DashboardStats(BaseModel):
    total_agents: int
    total_knowledge_bases: int
    total_interactions: int
    total_cost: float
    model_config = ConfigDict(from_attributes=True)

class FinancialReportItem(BaseModel):
    date: str
    agent_id: Optional[int]
    agent_name: Optional[str]
    total_messages: int
    total_tokens: int
    total_cost: float
    avg_cost_per_message: float
    unique_sessions: int

class FinancialReport(BaseModel):
    items: List[FinancialReportItem]
    grand_total_cost: float

# --- RAG & SEARCH SCHEMAS ---

class RAGSimulationRequest(BaseModel):
    query: str
    translation_enabled: bool = False
    multi_query_enabled: bool = False
    rerank_enabled: bool = False
    agentic_eval_enabled: bool = False
    parent_expansion_enabled: bool = False
    limit: int = 5

class CoverageCheckRequest(BaseModel):
    questions: List[str]

class MergeItemsRequest(BaseModel):
    item_ids: List[int]

# --- PROMPT ADVISOR & ARENA ---

class PromptAdvisorRequest(BaseModel):
    prompt_content: str
    initial_message: Optional[str] = None
    initial_question_message: Optional[str] = None
    ignore_messages: Optional[List[str]] = None
    user_query: str
    history: List[Dict[str, str]] = []

class PromptRefineRequest(BaseModel):
    prompt_content: str
    history: List[Dict[str, str]]
    user_instructions: Optional[str] = None

# --- SESSION & INTERACTION SCHEMAS ---

class DeleteSessionsRequest(BaseModel):
    session_ids: List[str]

class SessionPreview(BaseModel):
    session_id: Optional[str] = None
    agent_id: Optional[int] = None
    agent_name: Optional[str] = None
    start_time: Optional[datetime] = None
    last_interaction: Optional[datetime] = None
    message_count: Optional[int] = 0
    summary: Optional[str] = None
    total_cost: Optional[float] = 0.0
    is_test_session: Optional[bool] = False

class SessionMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime
    cost: float
    tokens: int
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    model: Optional[str] = None
    debug: Optional[Dict[str, Any]] = None

# --- FEEDBACK & FINE-TUNING SCHEMAS ---

class FeedbackCreate(BaseModel):
    agent_id: int
    interaction_log_id: Optional[int] = None
    user_message: str
    original_response: str
    rating: str = "negative"
    corrected_response: Optional[str] = None
    system_prompt_snapshot: Optional[str] = None
    correction_note: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    agent_id: int
    interaction_log_id: Optional[int]
    user_message: str
    original_response: Optional[str]
    corrected_response: Optional[str]
    rating: str
    correction_note: Optional[str]
    exported_to_finetune: bool
    finetune_job_id: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class FeedbackUpdate(BaseModel):
    user_message: Optional[str] = None
    corrected_response: Optional[str] = None
    correction_note: Optional[str] = None

class FineTuneJobCreate(BaseModel):
    agent_id: int
    base_model: str = "gpt-4o-mini-2024-07-18"
    n_epochs: int = 3
    suffix: Optional[str] = None

# --- SUPPORT & UNANSWERED SCHEMAS ---

class AnswerUnansweredRequest(BaseModel):
    answer: str
    knowledge_base_id: int
    question: Optional[str] = None

class SupportSummaryRequest(BaseModel):
    session_id: str
    agent_id: int

class BulkDeleteSupportRequest(BaseModel):
    ids: List[int]

# --- MISC SCHEMAS ---

class GenerateUploadUrlRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None
    kb_id: Optional[int] = None

class ConfirmUploadRequest(BaseModel):
    task_id: int
    kb_id: Optional[int] = None
    config: Dict[str, Any] = {}

class BulkAgentDeleteRequest(BaseModel):
    agent_ids: List[int]

class BulkResolveRequest(BaseModel):
    ids: List[int]

class AnswerToPromptRequest(BaseModel):
    agent_id: int
    answer: str
    question: Optional[str] = None

# --- TESTER SCHEMAS ---

class TesterProvocationRequest(BaseModel):
    session_id: Optional[str] = None
    persona_prompt: str
    history: List[Dict[str, str]]
    agent_id: Optional[int] = None
    agent_prompt: Optional[str] = None
    is_dynamic: Optional[bool] = False

class TesterEvaluationRequest(BaseModel):
    session_id: Optional[str] = None
    agent_id: Optional[int] = None
    persona_prompt: str
    history: List[Dict[str, str]]
    agent_prompt: Optional[str] = None

class TesterSentimentRequest(BaseModel):
    history: List[Dict[str, str]]
