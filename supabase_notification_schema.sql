-- Required by customer and admin notification APIs.
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer(customer_id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  booking_id text NULL,
  review_id text NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_notifications_customer_idx
ON public.customer_notifications (customer_id, created_at DESC);

ALTER TABLE public.pet
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_notifications'
      AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.customer_notifications
    ALTER COLUMN booking_id TYPE text USING booking_id::text;
  ELSE
    ALTER TABLE public.customer_notifications
    ADD COLUMN booking_id text NULL;
  END IF;
END $$;

ALTER TABLE public.customer_notifications
ADD COLUMN IF NOT EXISTS review_id text NULL;

CREATE INDEX IF NOT EXISTS customer_notifications_booking_idx
ON public.customer_notifications (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_notifications_review_idx
ON public.customer_notifications (review_id, created_at DESC);