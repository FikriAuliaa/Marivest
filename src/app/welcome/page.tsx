/**
 * Halaman ini sengaja dibuat statis agar Next.js dapat melakukan prerender.
 *
 * Pengecekan role SuperAdmin dilakukan di signInAction setelah autentikasi:
 * - SuperAdmin langsung diarahkan ke /admin.
 * - Mitra dan Pelaku Usaha diarahkan ke /welcome untuk melihat splash.
 *
 * Jangan memanggil cookies(), connection(), requireProfile(), atau fungsi
 * Supabase server di halaman ini karena route ini harus tetap bisa diprerender.
 */
export default function WelcomePage() {
  return null;
}
