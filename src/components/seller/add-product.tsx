"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createSellerProductAction } from "@/app/actions/seller";
import styles from "./seller.module.css";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const VALID_MIME = ["image/jpeg", "image/png", "image/webp"];

export function AddProduct({ businesses }: { businesses: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0] ?? null;
    setError("");
    if (photo && (!VALID_MIME.includes(photo.type) || photo.size > MAX_PHOTO_BYTES || photo.size === 0)) {
      setSelectedPhoto(null);
      setPhotoPreview(null);
      event.target.value = "";
      setError("Gunakan foto JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.");
      return;
    }
    setSelectedPhoto(photo);
    setPhotoPreview(photo ? URL.createObjectURL(photo) : null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await createSellerProductAction(data);
      if (result.status === "success") {
        router.push("/dashboard?tab=shop");
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Tidak dapat menyimpan produk. Coba kembali dengan foto berukuran lebih kecil.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}><div className={styles.device}>
      <header className={styles.top}><Link href="/dashboard?tab=shop">← Toko</Link><strong>MARIVEST</strong></header>
      <h1>Tambah Produk</h1>
      <p className={styles.muted}>Tambahkan hasil perikanan ke katalog usaha.</p>
      {businesses.length === 0 ? (
        <div className={styles.empty}>Belum ada profil usaha yang disetujui. Hubungi SuperAdmin untuk proses verifikasi usaha.</div>
      ) : (
        <form className={styles.formPanel} onSubmit={submit}>
          <label>Nama usaha<select name="business_id" required>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>Nama produk<input name="name" minLength={2} maxLength={150} required placeholder="Contoh: Ikan bandeng segar" /></label>
          <label>Kategori<select name="category"><option>Ikan Segar</option><option>Udang</option><option>Budidaya</option><option>Rumput Laut</option><option>Hasil Laut</option></select></label>
          <label>Deskripsi<textarea name="description" maxLength={1000} rows={3} /></label>
          <label>Harga satuan (Rp)<input name="price" type="number" min={1} max={1000000000000} step={1} required /></label>
          <label>Satuan<select name="unit"><option value="kg">kg</option><option value="pcs">pcs</option><option value="ikat">ikat</option><option value="box">box</option></select></label>
          <label>Stok awal<input name="stock" type="number" min={0} max={1000000} step={1} required /></label>
          <label htmlFor="product-photo">Foto produk (opsional)</label>
          <input id="product-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={styles.photoInput} onChange={onPhotoChange} />
          <p className={styles.photoHint}>JPG, PNG, atau WebP · maksimal 5 MB. Foto tersimpan di Supabase Storage setelah produk disimpan. Tanpa foto, katalog memakai gambar pengganti.</p>
          {photoPreview && selectedPhoto ? <div className={styles.photoPreview}><Image src={photoPreview} alt="Pratinjau foto produk" fill unoptimized sizes="440px" /></div> : null}
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? "Mengunggah dan menyimpan..." : "Simpan Produk"}</button>
        </form>
      )}
    </div></main>
  );
}
