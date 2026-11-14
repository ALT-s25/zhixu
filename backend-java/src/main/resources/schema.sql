CREATE TABLE IF NOT EXISTS ai_calls (
 request_id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 input_hash VARCHAR(64) NOT NULL, day_key VARCHAR(10) NOT NULL,
 created_at BIGINT NOT NULL, state VARCHAR(16) NOT NULL, answer CLOB
);
CREATE INDEX IF NOT EXISTS calls_user_day ON ai_calls(user_id,day_key);

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
