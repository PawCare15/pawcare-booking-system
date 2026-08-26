-- Required by Admin Booking Management payment status editing.
ALTER TABLE public.booking
ADD COLUMN IF NOT EXISTS payment_status character varying NOT NULL DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS booking_payment_status_idx
ON public.booking (payment_status);
