drop policy if exists "quotes_customer_select" on public.quotes;
create policy "quotes_customer_select"
  on public.quotes
  for select
  using (client_id = auth.uid()::text);

drop policy if exists "invoices_customer_select" on public.invoices;
create policy "invoices_customer_select"
  on public.invoices
  for select
  using (client_id = auth.uid()::text);

drop policy if exists "invoices_customer_update" on public.invoices;
create policy "invoices_customer_update"
  on public.invoices
  for update
  using (client_id = auth.uid()::text)
  with check (client_id = auth.uid()::text);
