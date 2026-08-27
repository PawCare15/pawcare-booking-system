-- Required by customer and admin notification APIs.
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer(customer_id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_notifications_customer_idx
ON public.customer_notifications (customer_id, created_at DESC);

ALTER TABLE public.pet
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();