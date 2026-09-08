-- Preserve historical bookings and reviews when a customer or pet is deleted.
-- Run this once in the Supabase SQL Editor.

ALTER TABLE public.booking
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN pet_id DROP NOT NULL;

ALTER TABLE public.review
  ALTER COLUMN customer_id DROP NOT NULL;

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT
      namespace.nspname AS schema_name,
      table_name.relname AS table_name,
      constraint_name.conname AS constraint_name
    FROM pg_constraint constraint_name
    JOIN pg_class table_name ON table_name.oid = constraint_name.conrelid
    JOIN pg_namespace namespace ON namespace.oid = table_name.relnamespace
    WHERE constraint_name.contype = 'f'
      AND namespace.nspname = 'public'
      AND (
        (table_name.relname = 'booking' AND pg_get_constraintdef(constraint_name.oid) LIKE '%(customer_id)%')
        OR (table_name.relname = 'booking' AND pg_get_constraintdef(constraint_name.oid) LIKE '%(pet_id)%')
        OR (table_name.relname = 'review' AND pg_get_constraintdef(constraint_name.oid) LIKE '%(customer_id)%')
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      constraint_record.schema_name,
      constraint_record.table_name,
      constraint_record.constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE public.booking
  ADD CONSTRAINT booking_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id) ON DELETE SET NULL,
  ADD CONSTRAINT booking_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pet(pet_id) ON DELETE SET NULL;

ALTER TABLE public.review
  ADD CONSTRAINT review_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id) ON DELETE SET NULL;