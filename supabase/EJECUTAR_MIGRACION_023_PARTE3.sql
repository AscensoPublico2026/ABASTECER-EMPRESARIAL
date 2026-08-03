insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitio', 'sitio', true, 5242880, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];

create policy "sitio_imagenes_public_read" on storage.objects for select using (bucket_id = 'sitio');
create policy "sitio_imagenes_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'sitio');
create policy "sitio_imagenes_auth_update" on storage.objects for update to authenticated using (bucket_id = 'sitio');
create policy "sitio_imagenes_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'sitio');
