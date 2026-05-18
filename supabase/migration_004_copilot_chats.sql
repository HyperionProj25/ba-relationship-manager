-- Copilot chat history
CREATE TABLE copilot_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES copilot_chats(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_copilot_messages_chat_id ON copilot_messages(chat_id);
CREATE INDEX idx_copilot_chats_updated ON copilot_chats(updated_at DESC);

-- Auto-update updated_at on copilot_chats when messages are added
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE copilot_chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copilot_message_inserted
  AFTER INSERT ON copilot_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamp();

ALTER TABLE copilot_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON copilot_chats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE copilot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON copilot_messages FOR ALL USING (true) WITH CHECK (true);
