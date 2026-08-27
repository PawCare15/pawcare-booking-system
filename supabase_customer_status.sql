-- Required by Admin Customer status editing and deletion-request display.
-- This does not change or generate any existing IDs.
ALTER TABLE public.customer
ADD COLUMN IF NOT EXISTS status character varying NOT NULL DEFAULT 'Active';

CREATE INDEX IF NOT EXISTS customer_status_idx
ON public.customer (status);

-- Required by the admin customer deletion confirmation flow.
ALTER TABLE public.customer
ADD COLUMN IF NOT EXISTS delete_token text,
ADD COLUMN IF NOT EXISTS delete_token_expiry timestamp with time zone;

CREATE INDEX IF NOT EXISTS customer_delete_token_idx
ON public.customer (delete_token);
