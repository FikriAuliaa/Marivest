"use client";

import Image from "next/image";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { registerInvestorAction, revokeInvestorAction } from "@/app/actions/investor";
import {
  setCartQuantityAction, checkoutCartAction, commitFundingAction,
  markNotificationReadAction, changeProfileNameAction, changePasswordAction,
} from "@/app/actions/buyer";
import type { AppRole } from "@/lib/auth/types";
import type { InvestorActionState, InvestorStatus } from "@/lib/investor/types";
import type { ProductView, CartView, OrderView, FundingView, CommitmentView, NotificationView, ActionResult } from "@/lib/domain/types";
import { fundingPercent, remainingTarget, validateCommitment } from "@/lib/domain/funding";
import { orderTotal } from "@/lib/domain/orders";
import { Icon, type IconName } from "./icons";
import styles from "./marivest-home.module.css";

type UserRole = Exclude<AppRole, "superadmin">;
type Tab = "home" | "marketplace" | "investor" | "notifications" | "profile";
type ModalName = "cart" | "orders" | "product" | "project" | "editProfile" | "password" | null;

type Props = {
  fullName: string;
  email: string;
  role: UserRole;
  investorStatus: InvestorStatus;
  products: ProductView[];
  cart: CartView[];
  orders: OrderView[];
  projects: FundingView[];
  commitments: CommitmentView[];
  notifications: NotificationView[];
  initialTab: Tab;
  dataError: string | null;
};

const initialInvestorState: InvestorActionState = { status: "idle", message: "" };

const nav: { id: Tab; label: string; icon: IconName }[] = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "marketplace", label: "Marketplace", icon: "shopping-bag" },
  { id: "investor", label: "Investasi", icon: "wallet" },
  { id: "notifications", label: "Notifikasi", icon: "bell" },
];
const categories: { label: string; icon: IconName }[] = [
  { label: "Semua", icon: "grid" },
  { label: "Ikan Segar", icon: "fish" },
  { label: "Udang", icon: "waves" },
  { label: "Budidaya", icon: "leaf" },
  { label: "Rumput Laut", icon: "sparkles" },
  { label: "Hasil Laut", icon: "shopping-bag" },
];
const interests = [
  ["budidaya", "Budidaya"], ["nelayan", "Nelayan"], ["tambak", "Tambak"],
  ["rantai_pasok", "Rantai pasok"], ["rumput_laut", "Rumput laut"], ["umkm", "UMKM"],
] as const;
const statusLabels: Record<OrderView["status"], string> = {
  pending: "Menunggu konfirmasi", confirmed: "Dikonfirmasi",
  completed: "Selesai", cancelled: "Dibatalkan",
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
function compactRupiah(value: number) {
  return value >= 1_000_000 ? `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : rupiah(value);
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.modalSheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHandle} />
        <header className={styles.modalHeader}>
          <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </section>
    </div>
  );
}

function ProductCard({ product, onOpen, onAdd, isSeller }: {
  product: ProductView; onOpen: () => void; onAdd: () => void; isSeller: boolean;
}) {
  return (
    <article className={styles.productCard}>
      <button className={styles.productVisualButton} type="button" onClick={onOpen}>
        <div className={styles.productImageWrap}>
          <Image src={product.image} alt={product.name} fill unoptimized sizes="(max-width: 480px) 44vw, 200px" className={styles.productImage} />
          <span className={styles.productCategory}>{product.category}</span>
        </div>
      </button>
      <div className={styles.productContent}>
        <button className={styles.productTitleButton} type="button" onClick={onOpen}>
          <span className={styles.productName}>{product.name}</span>
        </button>
        <span className={styles.productSeller}>{product.seller}</span>
        <div className={styles.productLocation}><Icon name="map-pin" size={12} /><span>{product.location}</span></div>
        <div className={styles.productPriceRow}><strong>{rupiah(product.price)}</strong><span>/{product.unit}</span></div>
        <div className={styles.productBottomRow}>
          <span className={styles.stockLabel}>Stok {product.stock} {product.unit}</span>
          <button className={styles.productAction} type="button" onClick={isSeller ? onOpen : onAdd} disabled={product.stock === 0}>
            {isSeller ? "Lihat" : product.stock === 0 ? "Habis" : "Tambah"}
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function FundingCard({ project, onOpen }: { project: FundingView; onOpen: () => void }) {
  const percent = Math.round(fundingPercent(project.raised, project.target));
  return (
    <button className={styles.fundingCard} type="button" onClick={onOpen}>
      <span className={styles.fundingImageWrap}>
        <Image src={project.image} alt={project.title} fill unoptimized sizes="120px" className={styles.fundingImage} />
      </span>
      <span className={styles.fundingContent}>
        <span className={styles.fundingTag}>{project.category}</span>
        <strong className={styles.fundingTitle}>{project.title}</strong>
        <span className={styles.fundingBusiness}>{project.business}</span>
        <span className={styles.fundingLocation}><Icon name="map-pin" size={12} /> {project.location}</span>
        <span className={styles.fundingNumbers}><b>{compactRupiah(project.raised)}</b><span>dari {compactRupiah(project.target)}</span></span>
        <span className={styles.progressTrack}><span className={styles.progressFill} style={{ width: `${percent}%` }} /></span>
        <span className={styles.fundingFooter}><span>{percent}% tercapai</span><span className={styles.fundingLink}>Detail <Icon name="arrow-up-right" size={12} /></span></span>
      </span>
    </button>
  );
}

function Heading({ children, onMore }: { children: ReactNode; onMore?: () => void }) {
  return <div className={styles.sectionHeading}><h2>{children}</h2>{onMore ? <button type="button" className={styles.textAction} onClick={onMore}>Lihat semua <Icon name="chevron-right" size={14} /></button> : null}</div>;
}

export function MarivestHome({
  fullName, email, role, investorStatus, products, cart, orders, projects, commitments, notifications, initialTab, dataError,
}: Props) {
  const router = useRouter();
  const isSeller = role === "pelaku_usaha";
  const isInvestor = role === "mitra" && investorStatus === "active";
  const displayRole = isSeller ? "Pelaku Usaha Perikanan" : isInvestor ? "Investor" : "Mitra / Investor (Perlu Pendaftaran)";
  const firstName = fullName.trim().split(/\s+/)[0] || "Sahabat";
  const initials = fullName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "M";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [product, setProduct] = useState<ProductView | null>(null);
  const [project, setProject] = useState<FundingView | null>(null);
  const [qty, setQty] = useState(1);
  const [fundingAmount, setFundingAmount] = useState("");
  const [fundingKey, setFundingKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [profileMenu, setProfileMenu] = useState(false);
  const [showInvestorForm, setShowInvestorForm] = useState(false);
  const [investorType, setInvestorType] = useState("individual");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [registerState, registerAction, registering] = useActionState(registerInvestorAction, initialInvestorState);
  const [revokeState, revokeAction, revoking] = useActionState(revokeInvestorAction, initialInvestorState);
  const [newName, setNewName] = useState(fullName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((item) => (category === "Semua" || item.category === category)
      && (!query || `${item.name} ${item.seller} ${item.category} ${item.location}`.toLowerCase().includes(query)));
  }, [products, category, search]);
  const subtotal = cart.reduce((total, entry) => total + orderTotal(entry.product.price, entry.quantity), 0);

  async function perform(operation: () => Promise<ActionResult>, onSuccess?: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await operation();
      setToast(result.message);
      if (result.status === "success") {
        onSuccess?.();
        router.refresh();
      }
    } catch {
      setToast("Layanan belum dapat dihubungi. Silakan coba kembali.");
    } finally {
      setBusy(false);
    }
  }
  const openProduct = (item: ProductView) => { setProduct(item); setQty(1); setModal("product"); };
  const openProject = (item: FundingView) => {
    setProject(item); setFundingAmount(""); setFundingKey(null); setModal("project");
  };
  const showProducts = (items: ProductView[]) => items.length ? (
    <div className={styles.productGrid}>{items.map((item) => (
      <ProductCard key={item.id} product={item} isSeller={isSeller}
        onOpen={() => openProduct(item)}
        onAdd={() => perform(() => setCartQuantityAction(item.id, (cart.find((c) => c.productId === item.id)?.quantity ?? 0) + 1))} />
    ))}</div>
  ) : <div className={styles.emptyState}><Icon name="shopping-bag" size={25} /><strong>Belum ada produk tersedia</strong><p>Produk akan tampil setelah pelaku usaha mempublikasikannya.</p></div>;
  const categoryStrip = () => (
    <div className={styles.categoryStrip} aria-label="Kategori produk">
      {categories.map((item) => <button key={item.label} type="button" aria-pressed={category === item.label}
        className={`${styles.categoryItem} ${category === item.label ? styles.categoryItemActive : ""}`}
        onClick={() => setCategory(item.label)}>
        <span className={styles.categoryIcon}><Icon name={item.icon} size={22} /></span><span>{item.label}</span>
      </button>)}
    </div>
  );
  const renderHome = () => <>
    <section className={styles.welcomeRow}><h1>Halo, {firstName}</h1></section>
    <label className={styles.searchBar}>
      <Icon name="search" size={18} />
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari ikan atau hasil laut..." aria-label="Cari produk" />
      <button type="button" aria-label="Buka marketplace" onClick={() => { setSearch(""); setTab("marketplace"); }}><Icon name="filter" size={16} /></button>
    </label>
    <section className={styles.heroBanner}>
      <Image src="/images/pon.jpg" alt="Budidaya perikanan" fill priority sizes="(max-width: 480px) 100vw, 440px" className={styles.heroImage} />
      <div className={styles.heroShade}/>
      <span className={styles.heroPill}><Icon name="waves" size={13} /> EKOSISTEM PERIKANAN</span>
      <div className={styles.heroCopy}><p>DARI PESISIR UNTUK MASA DEPAN</p><h2>Jelajahi hasil laut. Dukung usaha lokal.</h2>
        <button type="button" onClick={() => { setSearch(""); setTab("marketplace"); }}>Mulai jelajahi <Icon name="arrow-right" size={15} /></button>
      </div>
    </section>
    <section className={styles.sectionBlock}><Heading>Kategori pilihan</Heading>{categoryStrip()}</section>
    <section className={styles.sectionBlock}><Heading onMore={() => { setSearch(""); setTab("marketplace"); }}>Produk unggulan</Heading>{showProducts(visibleProducts.slice(0, 4))}</section>
  </>;
  const renderMarketplace = () => <>
    <section className={styles.pageHeading}><h1>Marketplace Marivest</h1></section>
    {categoryStrip()}
    <section className={styles.sectionBlock}><Heading>Produk perikanan</Heading>{showProducts(products.filter((item) => category === "Semua" || item.category === category))}</section>
  </>;
  const renderInvestor = () => <>
    <section className={styles.pageHeading}><h1>Investasi Maritim</h1><p>Yuk, investasi berbasis syariah dengan Marivest !</p></section>
    {isInvestor ? <>
      <section className={styles.sectionBlock}><Heading>Usaha yang membutuhkan pendanaan</Heading>
        {projects.length ? <div className={styles.fundingList}>{projects.map((item) => <FundingCard key={item.id} project={item} onOpen={() => openProject(item)} />)}</div>
          : <div className={styles.emptyState}><Icon name="wallet" size={25} /><strong>Belum ada pengajuan terbuka</strong><p>Proyek yang disetujui akan tampil di sini.</p></div>}
      </section>
      <section className={styles.sectionBlock}><Heading>Komitmen Saya</Heading>
        {commitments.length ? <div className={styles.notificationList}>{commitments.map((item) => (
          <article className={styles.notificationCard} key={item.id}><span className={styles.notificationIcon}><Icon name="wallet" size={18}/></span>
            <div><strong>{rupiah(item.amount)}</strong><p>Komitmen pendanaan tercatat</p><small>{new Date(item.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</small></div>
          </article>
        ))}</div> : <div className={styles.emptyState}><strong>Belum ada komitmen</strong></div>}
      </section>
    </> : <section className={styles.investorGate} aria-label="Pendaftaran Investor">
      <div className={styles.investorGateBackdrop} aria-hidden="true">
        {["Tambak berkelanjutan", "Penguatan nelayan", "Pakan budidaya"].map((name, i) => (
          <div key={name} className={styles.previewFundingCard}>
            <Image src={["/images/pon.jpg", "/images/nelayan.jpg", "/images/tambak.jpg"][i]} alt="" width={100} height={100} />
            <div><strong>{name}</strong><span>Ekosistem perikanan</span><span className={styles.progressTrack}><span className={styles.progressFill} style={{ width: `${(i + 2) * 19}%` }}/></span></div>
          </div>
        ))}
      </div>
      <div className={styles.investorGateOverlay}><div className={styles.investorGateCard}>
        <span className={styles.investorGateIcon}><Icon name="shield-check" size={25}/></span>
        <button className={styles.investorGateButton} type="button" onClick={() => setShowInvestorForm(true)}>Daftar Investor Sekarang <Icon name="arrow-right" size={16}/></button>
      </div></div>
    </section>}
  </>;
  const renderNotifications = () => <section className={styles.notificationsPage}>
    <div className={styles.pageHeading}><h1>Notifikasi</h1></div>
    {notifications.length ? <div className={styles.notificationList}>{notifications.map((item) => (
      <button type="button" key={item.id} className={styles.notificationCard} onClick={() => { if (!item.isRead) perform(() => markNotificationReadAction(item.id)); }}>
        <span className={styles.notificationIcon}><Icon name={item.isRead ? "info" : "bell"} size={19} /></span>
        <span><strong>{item.title}{item.isRead ? "" : " · Baru"}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</small></span>
      </button>
    ))}</div> : <div className={styles.emptyState}><Icon name="bell" size={25}/><strong>Belum ada notifikasi</strong></div>}
  </section>;
  const renderProfile = () => <section className={styles.profilePage}>
    <button type="button" className={styles.profileBack} onClick={() => setTab("home")}><Icon name="chevron-right" size={15}/> Kembali</button>
    <section className={styles.profileHero}>
      <div className={styles.profileAvatarLarge} aria-hidden="true">{initials}</div>
      <div className={styles.profileIdentity}>
        <p className={styles.sectionEyebrow}>PROFIL PENGGUNA</p><h1>{fullName}</h1>
        <div className={styles.profileStatusLine}><span>{displayRole}</span>
          {isInvestor ? <button className={styles.revokeInline} type="button" onClick={() => setConfirmRevoke(true)}>Cabut status</button> : null}
        </div>
      </div>
    </section>
    <div className={styles.profileOptionList}>
      <button type="button" className={styles.profileOption} onClick={() => setModal("editProfile")}><span><strong>Ubah Data Profil</strong><small>Perbarui nama dan informasi akun.</small></span><Icon name="chevron-right" size={16}/></button>
      <button type="button" className={styles.profileOption} onClick={() => setModal("password")}><span><strong>Ganti Kata Sandi</strong><small>Kelola keamanan akun Anda.</small></span><Icon name="chevron-right" size={16}/></button>
      <form action={signOutAction} className={styles.profileOptionForm}><button type="submit" className={`${styles.profileOption} ${styles.profileOptionDanger}`}><span><strong>Keluar</strong><small>Akhiri sesi aplikasi.</small></span><Icon name="arrow-right" size={16}/></button></form>
    </div>
  </section>;

  return <main className={styles.page}><div className={styles.device}>
    <header className={styles.topBar}>
      <div className={styles.brand}><span className={styles.brandText}><strong>MARIVEST</strong></span></div>
      <div className={styles.profileMenuWrap}>
        <button className={styles.avatarButton} type="button" aria-label="Menu akun" aria-expanded={profileMenu} onClick={() => setProfileMenu((value) => !value)}>{initials}</button>
        {profileMenu ? <div className={styles.profileMenu}>
          <button type="button" onClick={() => { setProfileMenu(false); setTab("profile"); }}><Icon name="user" size={16}/> Lihat Profil Saya</button>
          <form action={signOutAction}><button type="submit" className={styles.profileMenuLogout}><Icon name="arrow-right" size={16}/> Keluar</button></form>
        </div> : null}
      </div>
    </header>
    <div className={styles.mainContent}>
      {dataError ? <div className={styles.dataWarning} role="alert">{dataError}</div> : null}
      {tab === "home" ? renderHome() : null}
      {tab === "marketplace" ? renderMarketplace() : null}
      {tab === "investor" ? renderInvestor() : null}
      {tab === "notifications" ? renderNotifications() : null}
      {tab === "profile" ? renderProfile() : null}
    </div>
    {tab !== "profile" ? <div className={styles.bottomDock}>
      <nav className={styles.bottomNav} aria-label="Navigasi utama">{nav.filter((item) => !isSeller || item.id !== "investor").map((item) => (
        <button key={item.id} type="button" className={`${styles.navItem} ${tab === item.id ? styles.navItemActive : ""}`}
          onClick={() => setTab(item.id)} aria-label={item.label} aria-current={tab === item.id ? "page" : undefined}>
          <span className={styles.navIconWrap}><Icon name={item.icon} size={20} filled={item.id === "home" && tab === "home"} /></span>
        </button>
      ))}</nav>
      <button className={styles.cartDockButton} type="button" onClick={() => setModal("cart")} aria-label="Keranjang">
        <Icon name="cart" size={21}/>{cart.length ? <span className={styles.cartBadge}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span> : null}
      </button>
    </div> : null}
    {toast ? <div className={styles.toast} role="status"><Icon name="info" size={16}/><span>{toast}</span><button type="button" aria-label="Tutup pesan" onClick={() => setToast("")}><Icon name="close" size={14}/></button></div> : null}

    {showInvestorForm ? <Modal title="Pendaftaran Investor" subtitle="Lengkapi identitas dan profil investor Anda." onClose={() => setShowInvestorForm(false)}>
      <form action={registerAction} className={styles.demoForm}>
        <label>Nama lengkap<input value={fullName} readOnly /></label>
        <label>Email<input type="email" value={email} readOnly /></label>
        <label>Jenis investor<select name="investor_type" value={investorType} onChange={(e) => setInvestorType(e.target.value)} required>
          <option value="individual">Individual Investor</option><option value="institutional">Institutional Investor</option><option value="impact">Impact Investor</option>
        </select></label>
        <label>Pekerjaan<input name="occupation" required minLength={2} maxLength={100} placeholder="Pekerjaan Anda" /></label>
        {investorType === "institutional" ? <label>Nama institusi<input name="institution_name" required minLength={2} maxLength={150} placeholder="Nama institusi" /></label> : null}
        <label>Penghasilan bulanan (opsional)<input name="monthly_income" type="number" min="0" max="1000000000000" step="1" inputMode="numeric" placeholder="Rupiah" /></label>
        <label>Nomor WhatsApp<input name="phone" type="tel" required minLength={8} maxLength={24} placeholder="081234567890" autoComplete="tel" /></label>
        <label>Domisili<input name="city" required minLength={2} maxLength={100} placeholder="Kota / Kabupaten" /></label>
        <div className={styles.interestGroup}><strong>Minat investasi (opsional)</strong><div className={styles.interestOptions}>{interests.map(([value, label]) => (
          <label key={value}><input type="checkbox" name="investment_interests" value={value}/>{label}</label>
        ))}</div></div>
        <label>Alasan bergabung (opsional)<textarea name="reason" rows={3} maxLength={500} placeholder="Mengapa tertarik dengan MARIVEST?"/></label>
        {registerState.status === "error" ? <p className={styles.investorActionError} role="alert">{registerState.message}</p> : null}
        <p className={styles.privacyNote}>Informasi penghasilan hanya untuk profil pribadi dan tidak ditampilkan di Marketplace.</p>
        <button className={styles.primaryButton} type="submit" disabled={registering}>{registering ? "Menyimpan..." : "Kirim Pendaftaran"}</button>
      </form>
    </Modal> : null}
    {confirmRevoke ? <Modal title="Cabut status Investor?" subtitle="Akses pendanaan akan dinonaktifkan. Anda tetap bisa menggunakan Marketplace." onClose={() => setConfirmRevoke(false)}>
      {revokeState.status === "error" ? <p className={styles.investorActionError} role="alert">{revokeState.message}</p> : null}
      <form action={revokeAction} className={styles.revokeConfirmForm}><button type="button" className={styles.secondaryButton} onClick={() => setConfirmRevoke(false)}>Batal</button>
        <button className={styles.primaryButton} type="submit" disabled={revoking}>{revoking ? "Memproses..." : "Ya, cabut status"}</button>
      </form>
    </Modal> : null}
    {modal === "product" && product ? <Modal title="Detail produk" onClose={() => setModal(null)}>
      <div className={styles.detailImage}><Image src={product.image} alt={product.name} fill unoptimized sizes="420px" className={styles.detailImageTag}/></div>
      <span className={styles.detailCategory}>{product.category}</span><h3 className={styles.detailTitle}>{product.name}</h3>
      <p className={styles.detailDescription}>{product.description || "Hasil perikanan berkualitas dari mitra MARIVEST."}</p>
      <div className={styles.detailMeta}><span><Icon name="shopping-bag" size={14}/>{product.seller}</span><span><Icon name="map-pin" size={14}/>{product.location}</span>
        <span>Stok tersedia: {product.stock} {product.unit}</span></div>
      <div className={styles.detailPrice}>{rupiah(product.price)} <small>/{product.unit}</small></div>
      {!isSeller ? <><div className={styles.qtySelector}><span>Jumlah</span><div><button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} disabled={busy}>−</button><strong>{qty}</strong>
        <button type="button" onClick={() => setQty((n) => Math.min(product.stock, n + 1))} disabled={busy || qty >= product.stock}>+</button></div></div>
        <button type="button" className={styles.primaryButton} disabled={busy || product.stock === 0} onClick={() => perform(
          () => setCartQuantityAction(product.id, (cart.find((c) => c.productId === product.id)?.quantity ?? 0) + qty), () => setModal(null),
        )}>{busy ? "Menyimpan..." : "Tambah ke keranjang"}</button></> : null}
    </Modal> : null}
    {modal === "cart" ? <Modal title="Keranjang" onClose={() => setModal(null)}>
      {cart.length ? <div className={styles.cartList}>{cart.map((entry) => <article className={styles.cartItem} key={entry.id}>
        <div className={styles.cartItemImage}><Image src={entry.product.image} alt={entry.product.name} fill unoptimized sizes="64px" /></div>
        <div className={styles.cartItemInfo}><strong>{entry.product.name}</strong><span>{rupiah(entry.product.price)} / {entry.product.unit}</span>
          <div className={styles.cartControls}><button type="button" disabled={busy} onClick={() => perform(() => setCartQuantityAction(entry.productId, entry.quantity - 1))}>−</button><b>{entry.quantity}</b><button type="button" disabled={busy} onClick={() => perform(() => setCartQuantityAction(entry.productId, entry.quantity + 1))}>+</button></div>
        </div>
        <button className={styles.removeButton} type="button" disabled={busy} onClick={() => perform(() => setCartQuantityAction(entry.productId, 0))} aria-label={`Hapus ${entry.product.name}`}><Icon name="close" size={15}/></button>
      </article>)}</div> : <div className={styles.emptyCart}><Icon name="cart" size={28}/><strong>Keranjang kosong</strong><p>Tambahkan produk dari Marketplace.</p></div>}
      <div className={styles.cartTotalRow}><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></div>
      <p className={styles.privacyNote}>Pemesanan dicatat tanpa pembayaran atau pengiriman otomatis.</p>
      <button type="button" className={styles.primaryButton} disabled={busy || cart.length === 0} onClick={() => perform(checkoutCartAction, () => setModal("orders"))}>{busy ? "Memproses..." : "Buat Pesanan"}</button>
      <button type="button" className={styles.secondaryButton} onClick={() => setModal("orders")}>Riwayat Pesanan</button>
    </Modal> : null}
    {modal === "orders" ? <Modal title="Riwayat Pesanan" onClose={() => setModal(null)}>
      {orders.length ? <div className={styles.orderList}>{orders.map((item) => <article className={styles.orderCard} key={item.id}>
        <div className={styles.orderInfo}><strong>{item.productName}</strong><span>{item.quantity} {item.unit} · {statusLabels[item.status]}</span><b>{rupiah(item.total)}</b>
          <small>{new Date(item.date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</small></div>
      </article>)}</div> : <div className={styles.emptyCart}><strong>Belum ada pesanan</strong></div>}
    </Modal> : null}
    {modal === "project" && project ? <Modal title="Detail investasi" subtitle="Pendanaan berbasis komitmen tanpa transfer dana." onClose={() => setModal(null)}>
      <div className={styles.detailImage}><Image src={project.image} alt={project.title} fill unoptimized sizes="420px" className={styles.detailImageTag}/></div>
      <span className={styles.detailCategory}>{project.category}</span><h3 className={styles.detailTitle}>{project.title}</h3>
      <p className={styles.detailDescription}>{project.description}</p><p className={styles.detailDescription}><strong>Tujuan:</strong> {project.purpose}</p>
      <div className={styles.detailMeta}><span><Icon name="shopping-bag" size={14}/>{project.business}</span><span><Icon name="map-pin" size={14}/>{project.location}</span></div>
      <div className={styles.projectDetailStats}><div><small>Target</small><strong>{rupiah(project.target)}</strong></div><div><small>Komitmen</small><strong>{rupiah(project.raised)}</strong></div></div>
      <div className={styles.progressTrack}><span className={styles.progressFill} style={{ width: `${fundingPercent(project.raised, project.target)}%` }}/></div>
      <p className={styles.privacyNote}>Porsi bagi hasil investor {Math.round(project.investorShareRatio * 100)}% dari laba yang benar-benar tercapai. Bukan janji keuntungan.</p>
      <label className={styles.actionField}>Nominal komitmen (Rp)<input type="number" min="1" step="1" inputMode="numeric" value={fundingAmount} onChange={(e) => { setFundingAmount(e.target.value); setFundingKey(null); }} placeholder="Masukkan nominal" /></label>
      <p className={styles.privacyNote}>Sisa target: {rupiah(remainingTarget(project.raised, project.target))}</p>
      <button type="button" className={styles.primaryButton} disabled={busy || !validateCommitment(Number(fundingAmount), remainingTarget(project.raised, project.target))} onClick={() => {
        const key = fundingKey ?? crypto.randomUUID();
        setFundingKey(key);
        perform(() => commitFundingAction(project.id, Number(fundingAmount), key), () => { setFundingKey(null); setModal(null); });
      }}>{busy ? "Menyimpan..." : "Catat Komitmen"}</button>
    </Modal> : null}
    {modal === "editProfile" ? <Modal title="Ubah Data Profil" onClose={() => setModal(null)}>
      <div className={styles.demoForm}><label>Nama lengkap<input value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)}/></label>
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => perform(() => changeProfileNameAction(newName), () => setModal(null))}>Simpan Profil</button></div>
    </Modal> : null}
    {modal === "password" ? <Modal title="Ganti Kata Sandi" onClose={() => setModal(null)}>
      <div className={styles.demoForm}><label>Password baru<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
        <label>Konfirmasi password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => perform(() => changePasswordAction(newPassword, confirmPassword), () => { setModal(null); setNewPassword(""); setConfirmPassword(""); })}>Ubah Password</button></div>
    </Modal> : null}
  </div></main>;
}
