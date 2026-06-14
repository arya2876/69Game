// ─────────────────────────────────────────────────────────
// Mock Data — CMS-Ready
// Replace these arrays with Sanity.io fetch() calls later.
// Each type mirrors a potential Sanity document schema.
// ─────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
}

export interface Branch {
  id: string;
  name: string;
  subtitle: string;
  address: string;
  status: "open" | "closed";
  statusText: string;
  hours: string;
  mapUrl: string;
}

export interface Facility {
  id: string;
  title: string;
  category: "PS5 VIP" | "PS4" | "PS3" | "Racing Simulator";
  price: string;
  image: string;
  tags: string[];
  description: string;
}

export interface Promo {
  id: string;
  title: string;
  description: string;
  badge: string;
  image: string;
  validUntil: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

// ── Navigation ───────────────────────────────────────────
export const navLinks: NavLink[] = [
  { label: "Beranda", href: "/" },
  { label: "Fasilitas", href: "/fasilitas" },
  { label: "Cek Ketersediaan", href: "/fasilitas" },
];

// ── Branches ─────────────────────────────────────────────
export const branches: Branch[] = [
  {
    id: "manyaran",
    name: "69Game — Manyaran",
    subtitle: "Paramount Village",
    address:
      "Ruko Paramount Village, Jl. Abdulrahman Saleh, Manyaran, Semarang",
    status: "open",
    statusText: "Buka — Tutup 01.00",
    hours: "10.00 - 01.00 WIB",
    mapUrl: "https://maps.google.com",
  },
  {
    id: "cabang2",
    name: "69Game — Cabang 2",
    subtitle: "Coming Soon",
    address: "Alamat akan segera diumumkan",
    status: "closed",
    statusText: "Segera Hadir",
    hours: "TBA",
    mapUrl: "https://maps.google.com",
  },
];

// ── Facilities ───────────────────────────────────────────
export const facilities: Facility[] = [
  {
    id: "ps5-vip-1",
    title: "PS5 VIP Room",
    category: "PS5 VIP",
    price: "Mulai Rp 15.000/jam",
    image: "/images/ps5-vip.png",
    tags: ["No Smoking", "AC", "Netflix", "Free WiFi"],
    description:
      "Ruangan VIP eksklusif dengan PS5, TV 4K 55 inch, sofa premium, dan sound system terbaik.",
  },
  {
    id: "ps5-vip-2",
    title: "PS5 VIP Couple Room",
    category: "PS5 VIP",
    price: "Mulai Rp 20.000/jam",
    image: "/images/ps5-vip.png",
    tags: ["No Smoking", "AC", "Netflix", "Private"],
    description:
      "Ruang privat untuk berdua dengan PS5, TV 50 inch, dan suasana nyaman.",
  },
  {
    id: "ps4-1",
    title: "PS4 Regular Room",
    category: "PS4",
    price: "Mulai Rp 8.000/jam",
    image: "/images/ps4-room.png",
    tags: ["AC", "Free WiFi"],
    description:
      "Ruangan PS4 standar dengan TV 43 inch dan kursi gaming yang nyaman.",
  },
  {
    id: "ps4-2",
    title: "PS4 Sharing Room",
    category: "PS4",
    price: "Mulai Rp 10.000/jam",
    image: "/images/ps4-room.png",
    tags: ["AC", "Free WiFi", "4 Player"],
    description:
      "Ruangan PS4 luas untuk bermain bersama teman hingga 4 orang.",
  },
  {
    id: "ps3-1",
    title: "PS3 Reguler Room",
    category: "PS3",
    price: "Mulai Rp 5.000/jam",
    image: "/images/ps3-room.png",
    tags: ["AC", "Free WiFi"],
    description:
      "Ruangan PS3 dengan koleksi game klasik terlengkap. Cocok untuk nostalgia gaming.",
  },
  {
    id: "ps3-2",
    title: "PS3 Sharing Room",
    category: "PS3",
    price: "Mulai Rp 7.000/jam",
    image: "/images/ps3-room.png",
    tags: ["AC", "Free WiFi", "Multiplayer"],
    description:
      "Bermain bareng di PS3 dengan layar besar dan suasana santai.",
  },
  {
    id: "racing-1",
    title: "Racing Simulator Pro",
    category: "Racing Simulator",
    price: "Mulai Rp 25.000/jam",
    image: "/images/racing-sim.png",
    tags: ["Steering Wheel", "3 Monitor", "Pedal Set"],
    description:
      "Simulator balap profesional dengan triple monitor, steering wheel Logitech, dan bucket seat.",
  },
  {
    id: "racing-2",
    title: "Racing Simulator Standard",
    category: "Racing Simulator",
    price: "Mulai Rp 18.000/jam",
    image: "/images/racing-sim.png",
    tags: ["Steering Wheel", "Single Monitor", "Pedal Set"],
    description:
      "Rasakan sensasi balapan dengan setup simulator standar yang tetap seru.",
  },
];

// ── Facility Categories (for filter tabs) ────────────────
export const facilityCategories = [
  "Semua",
  "PS5 VIP",
  "PS4",
  "PS3",
  "Racing Simulator",
] as const;

export type FacilityCategory = (typeof facilityCategories)[number];

// ── Promos ───────────────────────────────────────────────
export const promos: Promo[] = [
  {
    id: "promo-1",
    title: "Happy Hour",
    description:
      "Diskon 30% untuk semua fasilitas PS setiap hari Senin-Kamis pukul 10.00-14.00 WIB. Mainkan game favoritmu dengan harga hemat!",
    badge: "Hemat 30%",
    image: "/images/promo-happy-hour.png",
    validUntil: "Berlaku setiap minggu",
  },
  {
    id: "promo-2",
    title: "Promo Jum'at Berkah",
    description:
      "Setiap hari Jum'at dapatkan tambahan 30 menit gratis untuk setiap sesi 2 jam. Khusus rental PS5 VIP dan PS4!",
    badge: "+30 Menit FREE",
    image: "/images/promo-jumat-berkah.png",
    validUntil: "Setiap Jum'at",
  },
  {
    id: "promo-3",
    title: "Weekend Special",
    description:
      "Paket weekend hemat! Rental 3 jam bayar 2 jam untuk semua tipe ruangan. Ajak teman-temanmu dan main sepuasnya!",
    badge: "3 Jam = 2 Jam",
    image: "/images/promo-weekend.png",
    validUntil: "Sabtu & Minggu",
  },
];

// ── Social Links ─────────────────────────────────────────
export const socialLinks: SocialLink[] = [
  {
    platform: "Instagram",
    url: "https://instagram.com/69game.smg",
    label: "@69game.smg",
  },
  {
    platform: "TikTok",
    url: "https://tiktok.com/@69game.smg",
    label: "@69game.smg",
  },
];

export const whatsappNumber = "6281234567890";
export const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Halo%2069Game%21%20Saya%20ingin%20reservasi.`;

// ── Operational Hours ────────────────────────────────────
export const operationalHours = {
  manyaran: {
    label: "Manyaran (Paramount Village)",
    weekdays: "10.00 - 01.00 WIB",
    weekends: "09.00 - 01.00 WIB",
  },
  cabang2: {
    label: "Cabang 2",
    weekdays: "Coming Soon",
    weekends: "Coming Soon",
  },
};
