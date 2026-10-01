-- Required by admin pet status management and deleted-customer handling.
ALTER TABLE public.pet
ADD COLUMN IF NOT EXISTS status character varying(20) NOT NULL DEFAULT 'Active';

ALTER TABLE public.pet
ALTER COLUMN customer_id DROP NOT NULL;

UPDATE public.pet
SET status = 'Inactive'
WHERE customer_id IN (
	SELECT customer_id
	FROM public.customer
	WHERE status = 'deleted'
);

CREATE INDEX IF NOT EXISTS pet_status_idx
ON public.pet (status);
