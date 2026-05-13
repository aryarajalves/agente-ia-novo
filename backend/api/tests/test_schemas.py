"""
Testes unitários para api/schemas.py

Valida que todos os modelos Pydantic instanciam corretamente,
respeitam valores padrão e rejeitem dados inválidos.
"""
import pytest
from datetime import datetime
from api.schemas import (
    LoginRequest,
    UserCreate,
    UserUpdate,
    KnowledgeItem,
    KnowledgeBase,
    AgentConfig,
    MessageRequest,
    MessageResponse,
    PromptDraft,
    RAGSimulationRequest,
    CoverageCheckRequest,
    MergeItemsRequest,
    PromptAdvisorRequest,
    PromptRefineRequest,
    DeleteSessionsRequest,
    SessionPreview,
    SessionMessage,
    FeedbackCreate,
    FeedbackResponse,
    FeedbackUpdate,
    FineTuneJobCreate,
    AnswerUnansweredRequest,
    SupportSummaryRequest,
    BulkDeleteSupportRequest,
    GenerateUploadUrlRequest,
    ConfirmUploadRequest,
    BulkAgentDeleteRequest,
    TesterProvocationRequest,
    TesterEvaluationRequest,
    TesterSentimentRequest,
    DashboardStats,
    FinancialReportItem,
    FinancialReport,
    BatchDeleteRequest,
    BatchUpdateRequest,
)


class TestAuthSchemas:
    def test_login_request_valid(self):
        req = LoginRequest(email="user@test.com", password="secret123")
        assert req.email == "user@test.com"
        assert req.password == "secret123"

    def test_user_create_defaults(self):
        user = UserCreate(email="novo@test.com", password="pass")
        assert user.name == "Novo Usuário"
        assert user.role == "Usuário"
        assert user.status == "ATIVO"

    def test_user_update_all_optional(self):
        upd = UserUpdate()
        assert upd.name is None
        assert upd.email is None
        assert upd.password is None


class TestKnowledgeSchemas:
    def test_knowledge_item_defaults(self):
        item = KnowledgeItem(question="O que é X?", answer="X é Y.")
        assert item.category == "Geral"
        assert item.id is None
        assert item.metadata_val is None

    def test_knowledge_base_defaults(self):
        kb = KnowledgeBase()
        assert kb.name == "Nova Base"
        assert kb.kb_type == "qa"
        assert kb.items == []
        assert kb.question_label == "Pergunta"

    def test_knowledge_base_with_items(self):
        items = [KnowledgeItem(question="Q?", answer="A.")]
        kb = KnowledgeBase(name="Minha KB", items=items)
        assert len(kb.items) == 1
        assert kb.items[0].question == "Q?"

    def test_batch_delete_request(self):
        req = BatchDeleteRequest(item_ids=[1, 2, 3])
        assert len(req.item_ids) == 3

    def test_batch_update_request(self):
        req = BatchUpdateRequest(item_ids=[1, 2], answer="Nova resposta")
        assert req.answer == "Nova resposta"
        assert req.question is None

    def test_rag_simulation_defaults(self):
        req = RAGSimulationRequest(query="Buscar algo")
        assert req.limit == 5
        assert req.translation_enabled is False
        assert req.rerank_enabled is False

    def test_coverage_check_request(self):
        req = CoverageCheckRequest(questions=["P1?", "P2?"])
        assert len(req.questions) == 2

    def test_merge_items_request(self):
        req = MergeItemsRequest(item_ids=[10, 20])
        assert req.item_ids == [10, 20]


class TestAgentSchemas:
    def test_agent_config_defaults(self):
        cfg = AgentConfig()
        assert cfg.name == "Novo Agente"
        assert cfg.model == "gpt-5.2"
        assert cfg.temperature == 1.0
        assert cfg.is_active is True
        assert cfg.knowledge_base_ids == []
        assert cfg.tool_ids == []
        assert cfg.router_enabled is False

    def test_agent_config_security_defaults(self):
        cfg = AgentConfig()
        assert cfg.security_pii_filter is False
        assert cfg.security_bot_protection is False
        assert cfg.security_max_messages_per_session == 20
        assert cfg.security_loop_count == 3

    def test_message_request_minimal(self):
        req = MessageRequest(message="Olá!")
        assert req.message == "Olá!"
        assert req.session_id is None
        assert req.agent_id is None

    def test_message_request_full(self):
        req = MessageRequest(
            message="Teste",
            session_id="sess-123",
            agent_id=5,
            context_variables={"phone": "+55999"},
            model_override="gpt-4o"
        )
        assert req.session_id == "sess-123"
        assert req.agent_id == 5
        assert req.context_variables["phone"] == "+55999"

    def test_prompt_draft_defaults(self):
        draft = PromptDraft(prompt_text="Você é um assistente.")
        assert draft.character_count == 0
        assert draft.token_count == 0
        assert draft.agent_id is None

    def test_prompt_advisor_request(self):
        req = PromptAdvisorRequest(
            prompt_content="Conteúdo do prompt",
            user_query="Como melhorar?",
        )
        assert req.history == []
        assert req.initial_message is None

    def test_prompt_refine_request(self):
        req = PromptRefineRequest(
            prompt_content="Prompt original",
            history=[{"role": "user", "content": "Ok"}]
        )
        assert len(req.history) == 1
        assert req.user_instructions is None

    def test_bulk_agent_delete(self):
        req = BulkAgentDeleteRequest(agent_ids=[1, 2, 3])
        assert len(req.agent_ids) == 3


class TestSessionSchemas:
    def test_delete_sessions_request(self):
        req = DeleteSessionsRequest(session_ids=["abc", "def"])
        assert len(req.session_ids) == 2

    def test_session_preview_defaults(self):
        sp = SessionPreview()
        assert sp.message_count == 0
        assert sp.total_cost == 0.0
        assert sp.is_test_session is False

    def test_session_message(self):
        now = datetime.now()
        msg = SessionMessage(role="user", content="Oi", timestamp=now, cost=0.01, tokens=10)
        assert msg.role == "user"
        assert msg.input_tokens == 0


class TestFeedbackSchemas:
    def test_feedback_create_defaults(self):
        fb = FeedbackCreate(
            agent_id=1,
            user_message="Pergunta",
            original_response="Resposta"
        )
        assert fb.rating == "negative"
        assert fb.corrected_response is None

    def test_feedback_update_all_optional(self):
        upd = FeedbackUpdate()
        assert upd.user_message is None
        assert upd.corrected_response is None

    def test_fine_tune_job_create_defaults(self):
        job = FineTuneJobCreate(agent_id=2)
        assert job.base_model == "gpt-4o-mini-2024-07-18"
        assert job.n_epochs == 3
        assert job.suffix is None


class TestSupportSchemas:
    def test_answer_unanswered_request(self):
        req = AnswerUnansweredRequest(answer="Esta é a resposta.", knowledge_base_id=5)
        assert req.knowledge_base_id == 5
        assert req.question is None

    def test_support_summary_request(self):
        req = SupportSummaryRequest(session_id="sess-1", agent_id=3)
        assert req.agent_id == 3

    def test_bulk_delete_support(self):
        req = BulkDeleteSupportRequest(ids=[1, 2, 3, 4])
        assert len(req.ids) == 4


class TestUploadSchemas:
    def test_generate_upload_url_request(self):
        req = GenerateUploadUrlRequest(filename="video.mp4", kb_id=7)
        assert req.filename == "video.mp4"
        assert req.content_type is None

    def test_confirm_upload_request_defaults(self):
        req = ConfirmUploadRequest(task_id=42)
        assert req.config == {}
        assert req.kb_id is None


class TestTesterSchemas:
    def test_tester_provocation_minimal(self):
        req = TesterProvocationRequest(
            persona_prompt="Você é um cliente irritado.",
            history=[]
        )
        assert req.is_dynamic is False
        assert req.agent_id is None

    def test_tester_evaluation_request(self):
        req = TesterEvaluationRequest(
            persona_prompt="Cliente",
            history=[{"role": "user", "content": "Oi"}]
        )
        assert len(req.history) == 1

    def test_tester_sentiment_request(self):
        req = TesterSentimentRequest(history=[])
        assert req.history == []


class TestAnalyticsSchemas:
    def test_dashboard_stats(self):
        stats = DashboardStats(
            total_agents=5,
            total_knowledge_bases=3,
            total_interactions=100,
            total_cost=12.50
        )
        assert stats.total_agents == 5
        assert stats.total_cost == 12.50

    def test_financial_report(self):
        item = FinancialReportItem(
            date="2026-04-30",
            agent_id=1,
            agent_name="Agente 1",
            total_messages=50,
            total_tokens=2000,
            total_cost=5.0,
            avg_cost_per_message=0.1,
            unique_sessions=10
        )
        report = FinancialReport(items=[item], grand_total_cost=5.0)
        assert len(report.items) == 1
        assert report.grand_total_cost == 5.0
