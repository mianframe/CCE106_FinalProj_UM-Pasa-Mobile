-- Phase 29: Keep pending (reserved) approved listings visible on the marketplace until sold.
-- Update items_public_marketplace and items_signed_in_read policies to allow status in ('available', 'pending').

drop policy if exists items_public_marketplace on public.items;
drop policy if exists items_signed_in_read on public.items;

create policy items_public_marketplace on public.items
  for select to anon
  using (status in ('available', 'pending') and moderation_status = 'approved' and archived_at is null);

create policy items_signed_in_read on public.items
  for select to authenticated
  using (
    (status in ('available', 'pending') and moderation_status = 'approved' and archived_at is null)
    or seller_id = (select auth.uid())
    or (select private.is_admin())
    or exists (
      select 1 from public.transactions t
      where t.item_id = items.id
        and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
    )
  );
