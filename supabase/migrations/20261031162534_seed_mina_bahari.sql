-- MARIVEST: dataset simulasi Mina Bahari, berdasarkan Tracking Progress Marivest.pdf.
-- PERSYARATAN: buat akun Mina Bahari melalui Supabase Auth Admin API terlebih dahulu.
-- SQL ini tidak menyimpan email/password pada auth.users secara manual.
-- Disetujui hanya sebagai DATA SEED untuk demo/hackathon, bukan proses verifikasi produksi.
-- Aman dijalankan ulang: ON CONFLICT DO NOTHING tidak mereset stok/pesanan.
begin;

do $seed$
declare
  v_seller uuid;
  v_business uuid := '75ddf61d-0e9c-5a98-83b3-6a4ba415403f';
begin
  select p.id into v_seller
  from public.profiles as p
  join auth.users as u on u.id = p.id
  where lower(u.email) = 'minabahari@gmail.com'
    and p.role = 'pelaku_usaha'::public.app_role
  limit 1;

  if v_seller is null then
    raise exception 'Akun Auth Mina Bahari dengan role pelaku_usaha belum tersedia. Jalankan tools/seed-mina-bahari-account.mjs terlebih dahulu.';
  end if;

  -- Dataset dari PDF: usaha pembudidaya ikan sudah approved sebagai seed demo.
  insert into public.business_profiles
    (id, owner_id, name, category, city, description, verification_status)
  values
    (v_business, v_seller, 'Mina Bahari', 'pembudidaya_ikan', '',
     'Usaha budidaya ikan Mina Bahari untuk simulasi MARIVEST.', 'approved')
  on conflict (id) do nothing;

  -- Hindari mengaitkan produk ke business_id yang mungkin dipakai pemilik lain.
  if not exists (
    select 1 from public.business_profiles
    where id = v_business and owner_id = v_seller
  ) then
    raise exception 'Business seed ID Mina Bahari sudah dipakai oleh akun berbeda.';
  end if;

  -- Data Marketplace PDF hlm. 3: Ikan bandeng, Rp30.000/kg, stok awal 100 kg.
  -- Jumlah pesanan 10 kg dan total Rp300.000 adalah ilustrasi, bukan pesanan dibuat otomatis.
  insert into public.products
    (id, business_id, name, category, description, price, unit, stock, image_url, is_published)
  values
    ('01cfa85f-27cf-5072-8466-b7aef2fdfdb2', v_business, 'Ikan bandeng', 'Ikan Segar',
     'Ikan bandeng hasil budidaya Mina Bahari. Data simulasi marketplace.',
     30000, 'kg', 100, '/images/mina-bahari-bandeng.jpg', true)
  on conflict (id) do nothing;

end;
$seed$;

commit;
