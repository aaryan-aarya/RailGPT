ALTER TABLE ticket_email_outbox
    ADD COLUMN event_type VARCHAR(24) NOT NULL DEFAULT 'BOOKED',
    ADD COLUMN status_snapshot VARCHAR(16) NOT NULL DEFAULT 'CONFIRMED';

CREATE INDEX idx_ticket_email_event_type ON ticket_email_outbox (event_type, created_at);
