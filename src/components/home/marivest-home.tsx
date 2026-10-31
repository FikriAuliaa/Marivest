"use client";

import Image from "next/image";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import { registerInvestorAction, revokeInvestorAction } from "@/app/actions/investor";
import type { AppRole } from "@/lib/auth/types";
import type { InvestorActionState, InvestorStatus } from "@/lib/investor/types";
import { Icon, type IconName } from "./icons";
import styles from "./marivest-home.module.css";

type UserRole = Exclude<AppRole, "superadmin">;
type TabKey = "home" | "marketplace" | "investor" | "notifications" | "profile";
type ModalKey = "cart" | "product" | "project" | null;

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  seller: string;
  location: string;
  stock: number;
  description: string;
};

type FundingProject = {
  id: string;
  title: string;
  business: string;
  category: string;
  target: number;
  raised: number;
  location: string;
  image: string;
  status: string;
  description: string;
};

type MarivestHomeProps = {
  fullName: string;
  role: UserRole;
  investorStatus: InvestorStatus;
};

const INITIAL_INVESTOR_ACTION_STATE: InvestorActionState = {
  status: "idle",
  message: "",
};

const featuredProducts: Product[] = [
  {
    id: "bandeng",
    name: "Ikan Bandeng Segar",
    category: "Ikan Segar",
    price: 32000,
    unit: "kg",
    image: "/images/nelayan.jfif",
    seller: "Tambak Mina Sejahtera",
    location: "Sidoarjo, Jawa Timur",
    stock: 120,
    description:
      "Bandeng hasil budidaya tambak dengan penanganan pascapanen yang terjaga. Data ini masih berupa dummy untuk kebutuhan tampilan frontend.",
  },
  {
    id: "udang",
    name: "Udang Vaname Premium",
    category: "Udang",
    price: 68000,
    unit: "kg",
    image: "/images/tambak.jfif",
    seller: "Mina Bahari Farm",
    location: "Gresik, Jawa Timur",
    stock: 85,
    description:
      "Udang vaname budidaya untuk kebutuhan rumah tangga dan kuliner. Volume, ukuran, dan harga masih berupa data demonstrasi.",
  },
  {
    id: "nila",
    name: "Ikan Nila Budidaya",
    category: "Budidaya",
    price: 29000,
    unit: "kg",
    image: "/images/pon.jfif",
    seller: "Pokdakan Tirta Mina",
    location: "Pasuruan, Jawa Timur",
    stock: 95,
    description:
      "Ikan nila hasil budidaya kolam air tawar yang ditampilkan sebagai produk unggulan marketplace MARIVEST.",
  },
  {
    id: "rumput-laut",
    name: "Rumput Laut Kering",
    category: "Rumput Laut",
    price: 25000,
    unit: "kg",
    image: "/images/nile-river.jfif",
    seller: "Koperasi Pesisir Makmur",
    location: "Situbondo, Jawa Timur",
    stock: 200,
    description:
      "Rumput laut kering untuk kebutuhan pengolahan. Detail kualitas dan volume dalam prototipe ini bersifat ilustratif.",
  },
  {
    id: "kepiting",
    name: "Kepiting Bakau",
    category: "Hasil Laut",
    price: 92000,
    unit: "kg",
    image: "/images/fish-cleaning.jfif",
    seller: "Bahari Pesisir Nusantara",
    location: "Probolinggo, Jawa Timur",
    stock: 40,
    description:
      "Kepiting bakau hasil tangkapan nelayan yang dikurasi untuk kebutuhan visual homepage marketplace MARIVEST.",
  },
  {
    id: "kerapu",
    name: "Ikan Kerapu",
    category: "Ikan Segar",
    price: 88000,
    unit: "kg",
    image: "/images/fisher.jfif",
    seller: "Nelayan Bahari",
    location: "Banyuwangi, Jawa Timur",
    stock: 62,
    description:
      "Kerapu segar dengan kualitas premium. Data masih dummy dan belum terhubung ke transaksi nyata.",
  },
];

const fundingProjects: FundingProject[] = [
  {
    id: "funding-1",
    title: "Ekspansi Tambak Bandeng Syariah",
    business: "Tambak Mina Sejahtera",
    category: "Budidaya tambak",
    target: 25000000,
    raised: 16500000,
    location: "Sidoarjo, Jawa Timur",
    image: "/images/pon.jfif",
    status: "Sedang dibuka untuk komitmen pendanaan",
    description:
      "Pendanaan digunakan untuk penambahan benih, pakan, serta optimalisasi kolam produksi bandeng.",
  },
  {
    id: "funding-2",
    title: "Cold Storage Hasil Laut",
    business: "Koperasi Pesisir Makmur",
    category: "Rantai pasok",
    target: 40000000,
    raised: 24800000,
    location: "Lamongan, Jawa Timur",
    image: "/images/nelayan.jfif",
    status: "Terverifikasi internal · Demo",
    description:
      "Proyek penguatan rantai dingin agar kualitas hasil laut tetap terjaga sebelum dipasarkan.",
  },
  {
    id: "funding-3",
    title: "Pusat Pakan Mandiri Nelayan",
    business: "Komunitas Tambak Pesisir",
    category: "Penguatan komunitas",
    target: 18000000,
    raised: 9400000,
    location: "Gresik, Jawa Timur",
    image: "/images/tambak.jfif",
    status: "Menunggu putaran komitmen berikutnya",
    description:
      "Pengadaan fasilitas pengolahan pakan mandiri untuk menekan biaya operasional pelaku usaha perikanan.",
  },
];

const categories: { id: string; label: string; icon: IconName }[] = [
  { id: "Semua", label: "Semua", icon: "grid" },
  { id: "Ikan Segar", label: "Ikan Segar", icon: "fish" },
  { id: "Udang", label: "Udang", icon: "waves" },
  { id: "Budidaya", label: "Budidaya", icon: "leaf" },
  { id: "Rumput Laut", label: "Rumput Laut", icon: "sparkles" },
  { id: "Hasil Laut", label: "Hasil Laut", icon: "shopping-bag" },
];

const navItems: { id: TabKey; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "marketplace", label: "Marketplace", icon: "shopping-bag" },
  { id: "investor", label: "Investor", icon: "wallet" },
  { id: "notifications", label: "Notifikasi", icon: "bell" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }

  return formatCurrency(value);
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.modalSheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHandle} />
        <header className={styles.modalHeader}>
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </section>
    </div>
  );
}

function ProductCard({
  product,
  role,
  onOpen,
  onPrimary,
}: {
  product: Product;
  role: UserRole;
  onOpen: () => void;
  onPrimary: () => void;
}) {
  const isSeller = role === "pelaku_usaha";

  return (
    <article className={styles.productCard}>
      <button className={styles.productVisualButton} type="button" onClick={onOpen}>
        <div className={styles.productImageWrap}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 44vw, 200px"
            className={styles.productImage}
          />
          <span className={styles.productCategory}>{product.category}</span>
        </div>
      </button>
      <div className={styles.productContent}>
        <button className={styles.productTitleButton} type="button" onClick={onOpen}>
          <span className={styles.productName}>{product.name}</span>
        </button>
        <span className={styles.productSeller}>{product.seller}</span>
        <div className={styles.productLocation}>
          <Icon name="map-pin" size={12} />
          <span>{product.location}</span>
        </div>
        <div className={styles.productPriceRow}>
          <strong>{formatCurrency(product.price)}</strong>
          <span>/{product.unit}</span>
        </div>
        <div className={styles.productBottomRow}>
          <span className={styles.stockLabel}>Stok {product.stock} kg</span>
          <button className={styles.productAction} type="button" onClick={onPrimary}>
            {isSeller ? "Kelola" : "Tambah"}
            <Icon name={isSeller ? "chevron-right" : "plus"} size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function FundingCard({ project, onOpen, disabled = false }: { project: FundingProject; onOpen: () => void; disabled?: boolean }) {
  const progress = Math.min(100, Math.round((project.raised / project.target) * 100));

  return (
    <button className={styles.fundingCard} type="button" onClick={onOpen} disabled={disabled} tabIndex={disabled ? -1 : undefined}>
      <span className={styles.fundingImageWrap}>
        <Image src={project.image} alt={project.title} fill sizes="120px" className={styles.fundingImage} />
      </span>
      <span className={styles.fundingContent}>
        <span className={styles.fundingTag}>{project.category} · SIMULASI</span>
        <strong className={styles.fundingTitle}>{project.title}</strong>
        <span className={styles.fundingBusiness}>{project.business}</span>
        <span className={styles.fundingLocation}><Icon name="map-pin" size={12} /> {project.location}</span>
        <span className={styles.fundingNumbers}>
          <b>{formatCompactCurrency(project.raised)}</b>
          <span>dari {formatCompactCurrency(project.target)}</span>
        </span>
        <span className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
        </span>
        <span className={styles.fundingFooter}>
          <span>{progress}% tercapai</span>
          <span className={styles.fundingLink}>Detail <Icon name="arrow-up-right" size={12} /></span>
        </span>
      </span>
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        {eyebrow ? <p className={styles.sectionEyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action && onAction ? (
        <button className={styles.textAction} type="button" onClick={onAction}>
          {action} <Icon name="chevron-right" size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function MarivestHome({ fullName, role, investorStatus }: MarivestHomeProps) {
  const isSeller = role === "pelaku_usaha";
  const investorRegistered = role === "mitra" && investorStatus === "active";
  const profileRoleLabel = isSeller
    ? "Pelaku Usaha Perikanan"
    : investorRegistered
      ? "Investor"
      : "Mitra / Investor (Perlu Pendaftaran)";
  const firstName = fullName.trim().split(/\s+/)[0] || "Sahabat";
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "M";

  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [products] = useState<Product[]>(featuredProducts);
  const [projects] = useState<FundingProject[]>(fundingProjects);
  const [cartIds, setCartIds] = useState<string[]>(["bandeng", "udang"]);
  const [modal, setModal] = useState<ModalKey>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [toast, setToast] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [investorFormOpen, setInvestorFormOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [investorActionState, investorFormAction, isInvestorPending] = useActionState(
    registerInvestorAction,
    INITIAL_INVESTOR_ACTION_STATE,
  );
  const [revokeActionState, revokeFormAction, isRevoking] = useActionState(
    revokeInvestorAction,
    INITIAL_INVESTOR_ACTION_STATE,
  );

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === "Semua" || product.category === selectedCategory;
      const matchesQuery =
        !query ||
        `${product.name} ${product.category} ${product.seller} ${product.location}`.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [products, searchTerm, selectedCategory]);

  const featuredList = filteredProducts.slice(0, 4);
  const cartProducts = cartIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const cartTotal = cartProducts.reduce((total, product) => total + product.price, 0);

  const showToast = (message: string) => setToast(message);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setModal("product");
  };

  const addToCart = (product: Product) => {
    setCartIds((current) => [...current, product.id]);
    showToast(`${product.name} ditambahkan ke keranjang demo.`);
  };

  const openProject = (project: FundingProject) => {
    setSelectedProject(project);
    setModal("project");
  };

  const renderCategoryStrip = () => (
    <div className={styles.categoryStrip} aria-label="Kategori produk">
      {categories.map((category) => (
        <button
          className={`${styles.categoryItem} ${selectedCategory === category.id ? styles.categoryItemActive : ""}`}
          type="button"
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          aria-pressed={selectedCategory === category.id}
        >
          <span className={styles.categoryIcon}><Icon name={category.icon} size={22} /></span>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );

  const renderProductGrid = (items: Product[]) => {
    if (items.length === 0) {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><Icon name="search" size={24} /></span>
          <strong>Produk tidak ditemukan</strong>
          <p>Coba gunakan kata kunci atau kategori yang berbeda.</p>
        </div>
      );
    }

    return (
      <div className={styles.productGrid}>
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            role={role}
            onOpen={() => openProduct(product)}
            onPrimary={() => (isSeller ? openProduct(product) : addToCart(product))}
          />
        ))}
      </div>
    );
  };

  const renderHome = () => (
    <>
      <section className={styles.welcomeRow}>
        <h1>Halo, {firstName}</h1>
      </section>

      <label className={styles.searchBar}>
        <Icon name="search" size={18} />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Cari ikan, hasil laut, atau usaha..."
          aria-label="Cari produk atau usaha"
        />
        <button type="button" aria-label="Buka marketplace" onClick={() => setActiveTab("marketplace")}>
          <Icon name="filter" size={16} />
        </button>
      </label>

      <section className={styles.heroBanner}>
        <Image
          src="/images/pon.jfif"
          alt="Area budidaya perikanan"
          fill
          priority
          sizes="(max-width: 480px) 100vw, 440px"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />
        <span className={styles.heroPill}><Icon name="waves" size={13} /> EKOSISTEM PERIKANAN</span>
        <div className={styles.heroCopy}>
          <p>DARI PESISIR UNTUK MASA DEPAN</p>
          <h2>Jelajahi hasil laut. Dukung usaha lokal.</h2>
          <button type="button" onClick={() => setActiveTab("marketplace")}>
            Mulai jelajahi <Icon name="arrow-right" size={15} />
          </button>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <SectionHeading title="Kategori pilihan" />
        {renderCategoryStrip()}
      </section>

      <section className={styles.sectionBlock}>
        <SectionHeading
          title="Produk unggulan"
          action="Lihat semua"
          onAction={() => setActiveTab("marketplace")}
        />
        {renderProductGrid(featuredList)}
      </section>
    </>
  );

  const renderMarketplace = () => (
    <>
      <section className={styles.pageHeading}>
        <h1>Marketplace Marivest</h1>
      </section>
      {renderCategoryStrip()}
      <section className={styles.sectionBlock}>
        <SectionHeading title={`${filteredProducts.length} produk tersedia`} />
        {renderProductGrid(filteredProducts)}
      </section>
    </>
  );

  const renderInvestorRegistration = () => (
    <section className={styles.investorGate} aria-label="Pendaftaran Investor">
      <div className={styles.investorGateBackdrop} aria-hidden="true">
        {projects.map((project) => (
          <FundingCard
            key={project.id}
            project={project}
            onOpen={() => undefined}
            disabled
          />
        ))}
      </div>
      <div className={styles.investorGateOverlay}>
        <div className={styles.investorGateCard}>
          <span className={styles.investorGateIcon}>
            <Icon name="shield-check" size={25} />
          </span>
          <button
            className={styles.investorGateButton}
            type="button"
            onClick={() => setInvestorFormOpen(true)}
          >
            Daftar Investor Sekarang
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </div>
    </section>
  );

  const renderInvestorPage = () => (
    <>
      <section className={styles.pageHeading}>
        <h1>Investasi Maritim</h1>
        <p>Yuk, investasi berbasis syariah dengan Marivest !</p>
      </section>

      {investorRegistered ? (
        <>
          <section className={styles.sectionBlock}>
            <SectionHeading title="Usaha yang membutuhkan pendanaan" />
            <div className={styles.fundingList}>
              {projects.map((project) => (
                <FundingCard key={project.id} project={project} onOpen={() => openProject(project)} />
              ))}
            </div>
          </section>
          <div className={styles.investorRevokeRow}>
            <button
              className={styles.investorRevokeButton}
              type="button"
              onClick={() => setRevokeConfirmOpen(true)}
            >
              Cabut status Investor
            </button>
          </div>
        </>
      ) : (
        renderInvestorRegistration()
      )}
    </>
  );

  const renderNotifications = () => (
    <section className={styles.notificationsPage}>
      <section className={styles.pageHeading}>
        <h1>Notifikasi</h1>
      </section>
      <div className={styles.notificationList}>
        <article className={styles.notificationCard}>
          <span className={styles.notificationIcon}><Icon name="shopping-bag" size={19} /></span>
          <div>
            <strong>Produk pilihan tersedia</strong>
            <p>Jelajahi produk hasil laut unggulan di Marketplace Marivest.</p>
            <small>Baru saja</small>
          </div>
        </article>
        <article className={styles.notificationCard}>
          <span className={styles.notificationIcon}><Icon name="wallet" size={19} /></span>
          <div>
            <strong>Peluang investasi maritim</strong>
            <p>Lihat daftar usaha yang sedang membuka peluang pendanaan.</p>
            <small>Hari ini</small>
          </div>
        </article>
        <article className={styles.notificationCard}>
          <span className={styles.notificationIcon}><Icon name="info" size={19} /></span>
          <div>
            <strong>Selamat datang di Marivest</strong>
            <p>Temukan produk dan peluang usaha dari ekosistem perikanan.</p>
            <small>Informasi akun</small>
          </div>
        </article>
      </div>
    </section>
  );

  const renderProfile = () => (
    <section className={styles.profilePage}>
      <button className={styles.profileBack} type="button" onClick={() => setActiveTab("home")}>
        <Icon name="chevron-right" size={15} /> Kembali
      </button>
      <section className={styles.profileHero}>
        <div className={styles.profileAvatarLarge} aria-hidden="true">{initials}</div>
        <div className={styles.profileIdentity}>
          <p className={styles.sectionEyebrow}>PROFIL PENGGUNA</p>
          <h1>{fullName}</h1>
          <p>{profileRoleLabel}</p>
        </div>
      </section>

      <div className={styles.profileOptionList}>
        <button type="button" className={styles.profileOption} onClick={() => showToast("Form ubah data profil akan disambungkan pada tahap berikutnya.")}>
          <span>
            <strong>Ubah Data Profil</strong>
            <small>Perbarui nama, data diri, dan informasi akun.</small>
          </span>
          <Icon name="chevron-right" size={16} />
        </button>
        <button type="button" className={styles.profileOption} onClick={() => showToast("Fitur ganti kata sandi akan disambungkan pada tahap berikutnya.")}>
          <span>
            <strong>Ganti Kata Sandi</strong>
            <small>Kelola keamanan akun Anda secara mandiri.</small>
          </span>
          <Icon name="chevron-right" size={16} />
        </button>
        <form action={signOutAction} className={styles.profileOptionForm}>
          <button type="submit" className={`${styles.profileOption} ${styles.profileOptionDanger}`}>
            <span>
              <strong>Keluar</strong>
              <small>Akhiri sesi dan kembali ke halaman login.</small>
            </span>
            <Icon name="arrow-right" size={16} />
          </button>
        </form>
      </div>
    </section>
  );

  return (
    <main className={styles.page}>
      <div className={styles.device}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.brandText}>
              <strong>MARIVEST</strong>
            </span>
          </div>
          <div className={styles.profileMenuWrap}>
            <button
              className={styles.avatarButton}
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-label="Buka menu akun"
              aria-expanded={profileMenuOpen}
            >
              {initials}
            </button>
            {profileMenuOpen ? (
              <div className={styles.profileMenu}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setActiveTab("profile");
                  }}
                >
                  <Icon name="user" size={16} />
                  <span>Lihat Profil Saya</span>
                </button>
                <form action={signOutAction}>
                  <button type="submit" className={styles.profileMenuLogout}>
                    <Icon name="arrow-right" size={16} />
                    <span>Keluar</span>
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>

        <div className={styles.mainContent}>
          {activeTab === "home" ? renderHome() : null}
          {activeTab === "marketplace" ? renderMarketplace() : null}
          {activeTab === "investor" ? renderInvestorPage() : null}
          {activeTab === "notifications" ? renderNotifications() : null}
          {activeTab === "profile" ? renderProfile() : null}

          <footer className={styles.pageFooter}>
            <span className={styles.footerBrand}>MARIVEST</span>
            <p>Data pada tampilan ini merupakan demonstrasi frontend.</p>
          </footer>
        </div>

        {activeTab !== "profile" ? (
        <div className={styles.bottomDock}>
          <nav className={styles.bottomNav} aria-label="Navigasi utama">
            {navItems.filter((item) => role === "mitra" || item.id !== "investor").map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                aria-current={activeTab === item.id ? "page" : undefined}
              >
                <span className={styles.navIconWrap}>
                  <Icon name={item.icon} size={20} filled={item.id === "home" && activeTab === "home"} />
                </span>
              </button>
            ))}
          </nav>
          <button
            className={styles.cartDockButton}
            type="button"
            onClick={() => setModal("cart")}
            aria-label="Buka keranjang"
          >
            <Icon name="cart" size={21} />
            {cartIds.length > 0 ? <span className={styles.cartBadge}>{cartIds.length}</span> : null}
          </button>
        </div>
        ) : null}

        {toast ? (
          <div className={styles.toast} role="status">
            <Icon name="info" size={16} />
            <span>{toast}</span>
            <button type="button" onClick={() => setToast("")} aria-label="Tutup pesan">
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : null}

        {revokeConfirmOpen ? (
          <Modal
            title="Cabut status Investor?"
            subtitle="Akses ke peluang pendanaan akan dinonaktifkan. Anda dapat mendaftar kembali nanti."
            onClose={() => setRevokeConfirmOpen(false)}
          >
            {revokeActionState.status === "error" ? (
              <p className={styles.investorActionError} role="alert">{revokeActionState.message}</p>
            ) : null}
            <form action={revokeFormAction} className={styles.revokeConfirmForm}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setRevokeConfirmOpen(false)}
              >
                Batal
              </button>
              <button className={styles.primaryButton} type="submit" disabled={isRevoking}>
                {isRevoking ? "Memproses..." : "Ya, cabut akses"}
              </button>
            </form>
          </Modal>
        ) : null}

        {investorFormOpen ? (
          <Modal
            title="Pendaftaran Investor"
            subtitle="Lengkapi data berikut untuk mengaktifkan akses Investor MARIVEST."
            onClose={() => setInvestorFormOpen(false)}
          >
            <form action={investorFormAction} className={styles.demoForm}>
              <label>
                Nomor WhatsApp
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  minLength={8}
                  maxLength={24}
                  placeholder="Contoh: 081234567890"
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                Domisili
                <input
                  name="city"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  placeholder="Kota / Kabupaten"
                  autoComplete="address-level2"
                  required
                />
              </label>
              <label>
                Alasan bergabung (opsional)
                <textarea
                  name="reason"
                  rows={3}
                  maxLength={500}
                  defaultValue="Saya ingin mulai berinvestasi di sektor maritim."
                  placeholder="Tuliskan minat Anda sebagai investor..."
                />
              </label>
              {investorActionState.status === "error" ? (
                <p className={styles.investorActionError} role="alert">{investorActionState.message}</p>
              ) : null}
              <button className={styles.primaryButton} type="submit" disabled={isInvestorPending}>
                {isInvestorPending ? "Menyimpan pendaftaran..." : "Daftar Investor Sekarang"}
                <Icon name="arrow-right" size={16} />
              </button>
            </form>
          </Modal>
        ) : null}

        {modal === "cart" ? (
          <Modal title="Keranjang demo" subtitle="Produk pilihanmu untuk simulasi pemesanan." onClose={() => setModal(null)}>
            {cartProducts.length > 0 ? (
              <div className={styles.cartList}>
                {cartProducts.map((product, index) => (
                  <article className={styles.cartItem} key={`${product.id}-${index}`}>
                    <div className={styles.cartItemImage}>
                      <Image src={product.image} alt={product.name} fill sizes="64px" />
                    </div>
                    <div className={styles.cartItemInfo}>
                      <strong>{product.name}</strong>
                      <span>{formatCurrency(product.price)} / {product.unit}</span>
                    </div>
                    <button
                      className={styles.removeButton}
                      type="button"
                      onClick={() => setCartIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={`Hapus ${product.name}`}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCart}>
                <Icon name="cart" size={30} />
                <strong>Keranjang masih kosong</strong>
                <p>Tambahkan produk dari marketplace untuk melihat simulasi pesanan.</p>
              </div>
            )}
            <div className={styles.cartTotalRow}><span>Subtotal demo</span><strong>{formatCurrency(cartTotal)}</strong></div>
            <button className={styles.primaryButton} type="button" onClick={() => { setModal(null); showToast("Simulasi checkout belum dihubungkan ke transaksi nyata."); }}>
              Lanjutkan simulasi <Icon name="arrow-right" size={16} />
            </button>
          </Modal>
        ) : null}

        {modal === "product" && selectedProduct ? (
          <Modal title="Detail produk" subtitle="Informasi produk dari marketplace MARIVEST." onClose={() => setModal(null)}>
            <div className={styles.detailImage}>
              <Image src={selectedProduct.image} alt={selectedProduct.name} fill sizes="420px" className={styles.detailImageTag} />
            </div>
            <span className={styles.detailCategory}>{selectedProduct.category}</span>
            <h3 className={styles.detailTitle}>{selectedProduct.name}</h3>
            <p className={styles.detailDescription}>{selectedProduct.description}</p>
            <div className={styles.detailMeta}>
              <span><Icon name="map-pin" size={14} /> {selectedProduct.location}</span>
              <span><Icon name="shopping-bag" size={14} /> {selectedProduct.seller}</span>
            </div>
            <div className={styles.detailPrice}>{formatCurrency(selectedProduct.price)} <small>/ {selectedProduct.unit}</small></div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                if (isSeller) {
                  setModal(null);
                  showToast("Halaman pengelolaan produk akan dihubungkan pada tahap berikutnya.");
                } else {
                  addToCart(selectedProduct);
                  setModal(null);
                }
              }}
            >
              {isSeller ? "Kelola produk" : "Tambah ke keranjang"} <Icon name="arrow-right" size={16} />
            </button>
          </Modal>
        ) : null}

        {modal === "project" && selectedProject ? (
          <Modal title="Detail investasi" subtitle="Investasi Maritim · Simulasi frontend" onClose={() => setModal(null)}>
            <div className={styles.detailImage}>
              <Image src={selectedProject.image} alt={selectedProject.title} fill sizes="420px" className={styles.detailImageTag} />
            </div>
            <span className={styles.detailCategory}>{selectedProject.category}</span>
            <h3 className={styles.detailTitle}>{selectedProject.title}</h3>
            <p className={styles.detailDescription}>{selectedProject.description}</p>
            <div className={styles.projectDetailStats}>
              <div><small>Target</small><strong>{formatCurrency(selectedProject.target)}</strong></div>
              <div><small>Terkumpul</small><strong>{formatCurrency(selectedProject.raised)}</strong></div>
            </div>
            <div className={styles.progressTrack}><span className={styles.progressFill} style={{ width: `${Math.min(100, Math.round((selectedProject.raised / selectedProject.target) * 100))}%` }} /></div>
            <p className={styles.projectStatus}><Icon name="shield-check" size={14} /> {selectedProject.status}</p>
            <button className={styles.primaryButton} type="button" onClick={() => { setModal(null); showToast("Minat investasi berhasil dicatat dalam mode demo frontend."); }}>
              Saya tertarik <Icon name="arrow-right" size={16} />
            </button>
          </Modal>
        ) : null}
      </div>
    </main>
  );
}
