ALTER TABLE whatsapp_pending_connections
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 hour');