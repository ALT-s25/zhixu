-- Run once before deploying the conversation-map backend. Safe to re-run.
-- All data stays in the existing private backend schema; do not expose it in Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS zhixu_backend;
SET LOCAL search_path TO zhixu_backend;

CREATE TABLE IF NOT EXISTS ai_conversations (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, title VARCHAR(300) NOT NULL,
 document_id VARCHAR(36), source_path VARCHAR(500), excerpt TEXT NOT NULL,
 created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, revision BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS conversations_user_updated ON ai_conversations(user_id,updated_at);
CREATE TABLE IF NOT EXISTS ai_turns (
 id VARCHAR(36) PRIMARY KEY, conversation_id VARCHAR(36) NOT NULL REFERENCES ai_conversations(id),
 parent_id VARCHAR(36) REFERENCES ai_turns(id), question VARCHAR(300) NOT NULL, mode VARCHAR(16) NOT NULL,
 state VARCHAR(16) NOT NULL, answer TEXT, created_at BIGINT NOT NULL, pos_x DOUBLE PRECISION, pos_y DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS turns_conversation ON ai_turns(conversation_id,created_at);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA zhixu_backend FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ai_conversations, ai_turns FROM PUBLIC, anon, authenticated;
COMMIT;
