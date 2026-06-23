import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  Webhook,
  Key,
  FileText,
  ClipboardList,
  LogOut,
  Send,
  Server,
  Puzzle,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Languages,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { type UserRole } from '../hooks/useRole';
import { languageOptions, resolveSupportedLanguage, rtlLanguages, type SupportedLanguage } from '../i18n';
import './Layout.css';

interface GuideContent {
  title: string;
  description: string;
  features: string[];
  flowSteps: string[];
  tips?: string;
  warning?: string;
  caution?: string;
}

const guides: Record<string, GuideContent> = {
  '/': {
    title: '📊 Dashboard',
    description: 'Menu Dashboard adalah pusat informasi utama (main overview) yang menyajikan rangkuman aktivitas sistem secara real-time untuk memantau kesehatan aplikasi.',
    features: [
      'Total Pesan Terkirim: Akumulasi pesan sukses dikirim dari semua sesi.',
      'Pesan Tertunda (Pending): Jumlah pesan dalam antrean yang menunggu giliran kirim.',
      'Pesan Gagal: Total pesan gagal karena nomor tidak valid atau masalah koneksi.',
      'Sesi Aktif: Jumlah sesi WhatsApp terhubung (Connected) dibandingkan total sesi.'
    ],
    flowSteps: [
      'Pantau kartu status Sesi Aktif secara berkala.',
      'Periksa rasio Pesan Gagal. Jika meningkat tajam, kemungkinan nomor terblokir (banned).',
      'Gunakan grafik lalu lintas harian untuk mengukur beban request dari aplikasi luar.'
    ],
    tips: 'Data pada Dashboard diperbarui secara real-time menggunakan WebSocket. Jika grafik terhenti, silakan refresh halaman.'
  },
  '/sessions': {
    title: '🔌 Kelola Sesi (Sessions)',
    description: 'Menu Sesi digunakan untuk mengelola daur hidup (lifecycle) koneksi akun WhatsApp Anda menggunakan Chromium (whatsapp-web.js) atau Baileys.',
    features: [
      'Tambah Sesi: Mendaftarkan instans WhatsApp baru dengan ID unik.',
      'Scan QR Code: Menampilkan kode QR untuk proses login WhatsApp Web.',
      'Restart Sesi: Mematikan dan menghidupkan kembali instans Chromium yang macet.',
      'Hapus Sesi: Menghapus data sesi secara permanen.'
    ],
    flowSteps: [
      'Klik tombol "Tambah Sesi" di kanan atas.',
      'Isi Session ID (unik) dan pilih Engine (whatsapp-web.js / baileys).',
      'Klik "Scan QR" pada baris sesi baru (tunggu Chromium menyala di server).',
      'Buka WhatsApp HP -> Perangkat Tertaut -> Tautkan Perangkat, lalu scan QR Code di layar.',
      'Tunggu status berubah otomatis dari Initializing -> Authenticating -> Connected.'
    ],
    tips: 'Setiap sesi whatsapp-web.js menjalankan browser Chromium tersendiri yang memakan RAM sekitar 300MB-500MB. Batasi jumlah sesi aktif sesuai kapasitas RAM server.'
  },
  '/chats': {
    title: '👥 Kontak & Grup (Chats)',
    description: 'Menu Chats digunakan untuk mengelola kontak dan grup WhatsApp yang tersinkronisasi. Di sini Anda bisa mendapatkan JID Grup untuk keperluan pengiriman pesan massal.',
    features: [
      'Sinkronisasi Kontak: Menarik daftar kontak terbaru dari HP ke database.',
      'Ekspor Nomor Anggota Grup: Mengambil daftar nomor anggota grup untuk lead database.',
      'Salin JID Grup: Mendapatkan ID unik grup (misal: 120363028392019@g.us) untuk tujuan API.'
    ],
    flowSteps: [
      'Pilih Sesi WhatsApp aktif dari dropdown di bagian atas.',
      'Klik "Sinkronkan Kontak" atau "Muat Grup" untuk memperbarui data.',
      'Gunakan kolom pencarian untuk menyaring nama kontak atau nama grup.',
      'Salin JID Grup dari daftar untuk ditaruh di parameter payload API.'
    ]
  },
  '/webhooks': {
    title: '🪝 Webhook',
    description: 'Menu Webhook menghubungkan Velora WA dengan backend aplikasi Anda secara asinkron (real-time notification callback) untuk event WhatsApp.',
    features: [
      'Daftar Webhook: Mendaftarkan URL target HTTP POST eksternal.',
      'Filter Event: Mengirim event spesifik saja (misal: message.received, session.status).',
      'Delivery Logs: Memantau riwayat HTTP response status code dari server Anda.'
    ],
    flowSteps: [
      'Klik "Tambah Webhook" dan isi URL Target server Anda.',
      'Pilih jenis event yang ingin ditangkap (misal: message.received).',
      'Kirim pesan WhatsApp dari nomor luar untuk memicu event.',
      'Periksa tabel Webhook Logs di bawah untuk memastikan respon status 200 OK dari server Anda.'
    ],
    caution: 'Server Anda wajib membalas webhook Velora dalam waktu < 5 detik dengan status HTTP 200. Keterlambatan respon akan memicu pengiriman ulang (retry) otomatis.'
  },
  '/api-keys': {
    title: '⚙️ Pengaturan Keamanan (Settings / API Keys)',
    description: 'Menu ini digunakan untuk mengatur kredensial otentikasi global, limitasi akses API, serta melihat dokumentasi interaktif Swagger.',
    features: [
      'API Master Key: Kunci utama (Bearer Token) untuk otentikasi seluruh endpoint API.',
      'Swagger Docs: Antarmuka pengujian dan dokumentasi endpoint secara langsung.'
    ],
    flowSteps: [
      'Salin token dari kolom API Master Key.',
      'Klik tombol "Buka Dokumentasi Swagger" untuk mencoba endpoint.',
      'Lakukan rotasi API Master Key secara berkala demi keamanan.',
      'Perbarui token yang digunakan pada seluruh aplikasi eksternal Anda.'
    ]
  },
  '/templates': {
    title: '📋 Template Pesan (Templates)',
    description: 'Menu Template Pesan digunakan untuk menyimpan draf pesan atau format teks siap pakai agar proses pengiriman pesan berulang menjadi lebih praktis dan cepat.',
    features: [
      'Buat Template: Menyimpan format pesan teks yang sering dikirim.',
      'Variabel Dinamis: Menggunakan placeholder seperti {{name}} untuk personalisasi pesan.',
      'Pencarian Cepat: Menyaring template berdasarkan nama atau kode template.'
    ],
    flowSteps: [
      'Klik tombol "Tambah Template" di kanan atas.',
      'Masukkan Nama Template dan isi konten pesan (gunakan {{name}} untuk nama penerima).',
      'Klik "Simpan".',
      'Gunakan template tersebut pada menu penguji pesan atau API dengan memasukkan ID template.'
    ]
  },
  '/message-tester': {
    title: '✉️ Pesan & Message Tester',
    description: 'Menu Message Tester menyediakan antarmuka pengiriman pesan manual (untuk uji coba cepat) serta menampilkan log/riwayat lengkap lalu lintas pesan masuk dan keluar.',
    features: [
      'Kirim Pesan Instan: Kirim teks, gambar, berkas, atau dokumen secara langsung.',
      'Tipe Pesan Fleksibel: Pilihan input manual teks atau unggah berkas media.',
      'Uji Coba Cepat: Memastikan koneksi API dan sesi WhatsApp berjalan lancar.'
    ],
    flowSteps: [
      'Pilih Sesi Pengirim aktif.',
      'Masukkan Nomor Penerima dengan kode negara (contoh: 628123456789).',
      'Pilih tipe pesan (Text atau Media).',
      'Tulis pesan atau unggah berkas, lalu klik "Kirim" dan periksa status pengirimannya.'
    ],
    warning: 'Hindari mengirim pesan blast dalam jumlah sangat besar sekaligus tanpa jeda waktu agar nomor Anda tidak diblokir (banned) oleh WhatsApp. Atur delay minimal 10-20 detik.'
  },
  '/logs': {
    title: '📜 Riwayat Logs',
    description: 'Menu Logs menampilkan catatan aktivitas sistem, log pesan, dan status penanganan webhook untuk keperluan audit dan penelusuran masalah.',
    features: [
      'System Audit: Melacak aktivitas penting di sistem (pembuatan sesi, rotasi key).',
      'Filter Log: Menyaring log berdasarkan level (info, warn, error) dan kata kunci.',
      'Penelusuran Error: Membantu mendeteksi kenapa webhook gagal atau Chromium crash.'
    ],
    flowSteps: [
      'Pilih kategori log yang ingin dilihat.',
      'Filter log berdasarkan tanggal atau tipe error jika mencari isu spesifik.',
      'Gunakan data log untuk memperbaiki integrasi sistem eksternal.'
    ]
  },
  '/infrastructure': {
    title: '⚙️ Infrastruktur (System Admin Only)',
    description: 'Menu Infrastruktur digunakan oleh Administrator untuk memantau kesehatan server, penggunaan memori Chromium, dan resource Docker.',
    features: [
      'Hardware Monitor: Memantau kapasitas CPU dan penggunaan memori server.',
      'Docker Container Status: Melihat container sesi WhatsApp yang sedang berjalan.',
      'System Health: Verifikasi konektivitas ke database PostgreSQL, SQLite, dan Redis.'
    ],
    flowSteps: [
      'Gunakan menu ini untuk memantau beban CPU saat melakukan pesan blast massal.',
      'Jika server kehabisan memori, matikan beberapa sesi tidak terpakai dari menu Sesi.'
    ]
  },
  '/plugins': {
    title: '🧩 Plugin & Ekstensi',
    description: 'Menu Plugin digunakan untuk mengaktifkan atau menonaktifkan fitur tambahan/ekstensi pihak ketiga yang memperluas fungsionalitas Velora.',
    features: [
      'Kelola Plugin: Aktifkan atau nonaktifkan plugin eksternal.',
      'Custom Extension: Pemasangan plugin kustom sesuai kebutuhan alur bisnis Anda.'
    ],
    flowSteps: [
      'Pilih plugin yang ingin diaktifkan.',
      'Atur parameter plugin pada bagian konfigurasi jika tersedia.',
      'Simpan perubahan untuk menerapkan fungsi baru pada sesi WhatsApp Anda.'
    ]
  }
};

interface LayoutProps {
  onLogout: () => void;
  userRole: UserRole | null;
}

const allNavItems = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' as const, adminOnly: false },
  { to: '/sessions', icon: Smartphone, key: 'sessions' as const, adminOnly: false },
  { to: '/chats', icon: MessageSquare, key: 'chats' as const, adminOnly: false },
  { to: '/webhooks', icon: Webhook, key: 'webhooks' as const, adminOnly: false },
  { to: '/templates', icon: ClipboardList, key: 'templates' as const, adminOnly: false },
  { to: '/api-keys', icon: Key, key: 'apiKeys' as const, adminOnly: true },
  { to: '/message-tester', icon: Send, key: 'messageTester' as const, adminOnly: false },
  // Backend /infra/* is ADMIN-only; hide the nav item from non-admins (UX + defense-in-depth).
  { to: '/infrastructure', icon: Server, key: 'infrastructure' as const, adminOnly: true },
  { to: '/plugins', icon: Puzzle, key: 'plugins' as const, adminOnly: true },
  { to: '/logs', icon: FileText, key: 'logs' as const, adminOnly: false },
];

const themeIcons = { light: Sun, dark: Moon, system: Monitor };

export function Layout({ onLogout, userRole }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, palette, setPalette, paletteOptions } = useTheme();
  const ThemeIcon = themeIcons[theme];
  const themeLabel = t(`theme.${theme}`);
  const activePalette = paletteOptions.find(option => option.value === palette) ?? paletteOptions[0];

  const navItems = allNavItems.filter(item => !item.adminOnly || userRole === 'admin');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const location = useLocation();
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const appearanceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    if (isMobile) setIsMobileOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLanguageMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    if (!isAppearanceMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!appearanceMenuRef.current?.contains(event.target as Node)) {
        setIsAppearanceMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAppearanceMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAppearanceMenuOpen]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  const currentLang = resolveSupportedLanguage(i18n.resolvedLanguage || i18n.language);
  const languageLabel = languageOptions.find(option => option.value === currentLang)?.compactLabel ?? 'EN';
  const changeLanguage = (language: SupportedLanguage) => {
    setIsLanguageMenuOpen(false);
    void i18n.changeLanguage(language);
  };
  const isRtl = rtlLanguages.includes(currentLang);

  return (
    <div className="layout">
      {isMobile && (
        <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={toggleMobile} aria-label={t('common.expand')}>
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="mobile-brand">
            <img src="/logo_velora.jpg" alt="Velora" className="sidebar-logo" />
            <span className="brand-name">{t('common.appName')}</span>
          </div>
          <div style={{ width: 40 }} />
        </header>
      )}

      {isMobile && isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isMobileOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header">
          <img src="/logo_velora.jpg" alt="Velora" className="sidebar-logo" />
          {!isCollapsed && (
            <div className="sidebar-brand">
              <span className="brand-name">{t('common.appName')}</span>
              <span className="brand-subtitle">{t('common.appSubtitle')}</span>
            </div>
          )}
        </div>

        {!isMobile && (
          <button
            className="collapse-toggle"
            onClick={toggleCollapse}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
            aria-label={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed
              ? (isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)
              : (isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)}
          </button>
        )}

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, key }) => {
            const label = t(`nav.${key}`);
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={to === '/'}
                onClick={handleNavClick}
                title={isCollapsed ? label : undefined}
              >
                <Icon size={20} />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="language-menu" ref={languageMenuRef}>
            <button
              className="theme-toggle-btn"
              onClick={() => setIsLanguageMenuOpen(open => !open)}
              title={t('common.language')}
              aria-label={t('common.language')}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
            >
              <Languages size={18} />
              {!isCollapsed && <span>{languageLabel}</span>}
            </button>
            {isLanguageMenuOpen && (
              <div className="language-menu-list" role="menu" aria-label={t('common.language')}>
                {languageOptions.map(option => (
                  <button
                    key={option.value}
                    className={`language-menu-item ${option.value === currentLang ? 'active' : ''}`}
                    onClick={() => changeLanguage(option.value)}
                    role="menuitemradio"
                    aria-checked={option.value === currentLang}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="appearance-menu" ref={appearanceMenuRef}>
            <button
              className="theme-toggle-btn"
              onClick={() => setIsAppearanceMenuOpen(open => !open)}
              title={t('theme.label', { value: themeLabel })}
              aria-label={t('theme.appearance')}
              aria-haspopup="menu"
              aria-expanded={isAppearanceMenuOpen}
            >
              <span
                className="appearance-button-cue"
                style={{ '--swatch-color': activePalette.color } as CSSProperties}
                aria-hidden="true"
              >
                <ThemeIcon size={14} />
              </span>
              {!isCollapsed && <span>{themeLabel}</span>}
            </button>
            {isAppearanceMenuOpen && (
              <div className="appearance-menu-list" role="menu" aria-label={t('theme.appearance')}>
                <div className="appearance-menu-header">
                  <div>
                    <strong>{t('theme.appearance')}</strong>
                    <span>{activePalette.label}</span>
                  </div>
                  <span
                    className="appearance-current-swatch"
                    style={{ '--swatch-color': activePalette.color } as CSSProperties}
                    aria-hidden="true"
                  />
                </div>
                <div className="appearance-section">
                  <span className="appearance-section-label">{t('theme.mode')}</span>
                  <div className="appearance-mode-grid">
                    {(['light', 'dark', 'system'] as const).map(mode => {
                      const ModeIcon = themeIcons[mode];
                      return (
                        <button
                          key={mode}
                          className={`appearance-mode ${theme === mode ? 'active' : ''}`}
                          onClick={() => setTheme(mode)}
                          type="button"
                          role="menuitemradio"
                          aria-checked={theme === mode}
                        >
                          <ModeIcon size={16} />
                          <span>{t(`theme.${mode}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="appearance-section">
                  <span className="appearance-section-label">{t('theme.palette')}</span>
                  <div className="palette-grid">
                    {paletteOptions.map(option => (
                      <button
                        key={option.value}
                        className={`palette-swatch ${palette === option.value ? 'active' : ''}`}
                        onClick={() => setPalette(option.value)}
                        type="button"
                        title={option.label}
                        role="menuitemradio"
                        aria-checked={palette === option.value}
                        style={{ '--swatch-color': option.color } as CSSProperties}
                      >
                        <span />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={onLogout} title={isCollapsed ? t('common.logout') : undefined}>
            <LogOut size={20} />
            {!isCollapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      <main className={`main-content ${isCollapsed ? 'expanded' : ''} ${isMobile ? 'mobile' : ''}`}>
        <Outlet />
      </main>

      {/* FAB Bantuan Kontekstual */}
      <button 
        className="help-fab" 
        onClick={() => setIsHelpOpen(true)}
        title="Bantuan Kontekstual"
        aria-label="Bantuan Kontekstual"
      >
        <HelpCircle size={20} />
        <span>Bantuan</span>
      </button>

      {/* Drawer Bantuan */}
      {isHelpOpen && (
        <div className="help-drawer-overlay" onClick={() => setIsHelpOpen(false)} />
      )}
      <div className={`help-drawer ${isHelpOpen ? 'open' : ''}`} role="dialog" aria-labelledby="help-title">
        <div className="help-drawer-header">
          <h3 id="help-title">Bantuan: {guides[location.pathname]?.title || 'Panduan Penggunaan'}</h3>
          <button 
            className="help-drawer-close" 
            onClick={() => setIsHelpOpen(false)}
            aria-label="Tutup Bantuan"
          >
            <X size={18} />
          </button>
        </div>
        <div className="help-drawer-body">
          {guides[location.pathname] ? (
            <>
              <section>
                <h4>Deskripsi</h4>
                <p className="help-description">{guides[location.pathname].description}</p>
              </section>

              <section>
                <h4>Fitur Utama</h4>
                <ul className="help-list">
                  {guides[location.pathname].features.map((feat, i) => (
                    <li key={i}>{feat}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4>Alur Penggunaan</h4>
                <ol className="help-steps">
                  {guides[location.pathname].flowSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </section>

              {guides[location.pathname].tips && (
                <div className="help-alert tip">
                  <strong>💡 Tips:</strong>
                  {guides[location.pathname].tips}
                </div>
              )}

              {guides[location.pathname].warning && (
                <div className="help-alert warning">
                  <strong>⚠ Peringatan:</strong>
                  {guides[location.pathname].warning}
                </div>
              )}

              {guides[location.pathname].caution && (
                <div className="help-alert caution">
                  <strong>❌ Perhatian:</strong>
                  {guides[location.pathname].caution}
                </div>
              )}
            </>
          ) : (
            <p className="help-description">Panduan bantuan untuk menu ini belum tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
}
