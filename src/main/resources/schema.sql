CREATE TABLE IF NOT EXISTS ai_calls (
 request_id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
 input_hash VARCHAR(64) NOT NULL, day_key VARCHAR(10) NOT NULL,
 created_at BIGINT NOT NULL, state VARCHAR(16) NOT NULL, answer CLOB
);
CREATE INDEX IF NOT EXISTS calls_user_day ON ai_calls(user_id,day_key);
