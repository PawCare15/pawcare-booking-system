-- Required by admin pet status management and deleted-customer handling.
ALTER TABLE public.pet
ADD COLUMN IF NOT EXISTS status character varying(20) NOT NULL DEFAULT 'Active';

CREATE INDEX IF NOT EXISTS pet_status_idx
ON public.pet (status);
