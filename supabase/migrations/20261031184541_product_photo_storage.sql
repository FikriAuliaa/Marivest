-- Product images are publicly readable; only authenticated sellers can upload to their own directory.
-- Note: photos are public catalogue assets. Do not upload personal/sensitive documents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marivest_product_images_seller_insert" on storage.objects;
create policy "marivest_product_images_seller_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'pelaku_usaha')
);

drop policy if exists "marivest_product_images_seller_delete" on storage.objects;
create policy "marivest_product_images_seller_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'pelaku_usaha')
);
-- No update policy: photo replacement must create a new object, never overwrite another file.
-- Public buckets expose GET downloads without an additional SELECT policy.
