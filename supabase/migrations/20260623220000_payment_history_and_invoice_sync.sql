-- invoices: restore customer update policy (unchanged policy, just idempotent)
drop policy if exists "invoices_customer_update" on public.invoices;
create policy "invoices_customer_update"
  on public.invoices
  for update
  using (client_id = auth.uid()::text)
  with check (client_id = auth.uid()::text);

-- invoices: allow pros to SELECT invoices that belong to their quotes,
-- even in edge cases where owner_id might be mismatched.
drop policy if exists "invoices_pro_linked_select" on public.invoices;
create policy "invoices_pro_linked_select"
  on public.invoices
  for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.quotes q
      where q.id = invoices.quote_id
        and q.owner_id = auth.uid()
    )
  );

-- invoices: allow pros to see invoices they created whose owner_id
-- might have drifted (belt-and-suspenders for payment sync)
drop policy if exists "invoices_owner_all" on public.invoices;
create policy "invoices_owner_all"
  on public.invoices
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
