-- Empty prices request a quotation; existing numeric prices remain unchanged.
alter table public.products alter column price drop not null;
alter table public.products alter column price drop default;
