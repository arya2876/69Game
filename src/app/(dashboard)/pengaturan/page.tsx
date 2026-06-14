"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "@/contexts/UserContext";
import { useRealtimeFacilities } from "@/lib/hooks/useRealtimeFacilities";
import { useFacilityCategories } from "@/lib/hooks/useFacilityCategories";
import { createClient } from "@/lib/supabase/client";
import type { Facility, Branch } from "@/lib/types/database";
import PowerToolsTab from "@/components/dashboard/PowerToolsTab";
import ShiftManagerTab from "@/components/dashboard/ShiftManagerTab";

// ── SVG ICONS ───────────────────────────────────────────────
const SvgMonitor = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>);
const SvgPlus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const SvgTrash = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const SvgPencil = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
const SvgUpload = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
const SvgWrench = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>);
const SvgCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12" /></svg>);
const SvgMapPin = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>);
const SvgBuilding = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></svg>);
const SvgLoader = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>);
const SvgUsers = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const SvgX = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const SvgEye = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>);
const SvgEyeOff = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>);
const SvgList = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>);
const SvgQrCode = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="5" y="5" width="3" height="3" /><rect x="16" y="5" width="3" height="3" /><rect x="5" y="16" width="3" height="3" /><line x1="14" y1="14" x2="14" y2="14.01" /><line x1="18" y1="14" x2="18" y2="14.01" /><line x1="21" y1="14" x2="21" y2="14.01" /><line x1="14" y1="18" x2="14" y2="18.01" /><line x1="18" y1="18" x2="18" y2="18.01" /><line x1="21" y1="18" x2="21" y2="18.01" /><line x1="14" y1="21" x2="14" y2="21.01" /></svg>);
const SvgChefHat = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></svg>);
const SvgZap = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);
const SvgClock = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);

// ── TYPES ───────────────────────────────────────────────────
interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "cashier";
  branch_id: string | null;
  branch_name: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  branch_id: string;
  name: string;
  category: "fnb" | "extra_time";
  price: number;
  is_available: boolean;
  created_at: string;
}

// ── SUB-COMPONENTS ──────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (<div onClick={() => !disabled && onChange(!enabled)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${enabled ? "bg-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-slate-700"}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} /></div>);
}

function StatusBadge({ status }: { status: Facility["status"] }) {
  const c = { available: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Aktif" }, active: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Digunakan" }, waiting_next: { bg: "bg-neon-purple/10", text: "text-neon-purple", border: "border-neon-purple/20", label: "Menunggu" }, maintenance: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Nonaktif" } }[status];
  return (<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>{status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}{c.label}</span>);
}

function RoleBadge({ role }: { role: string }) {
  if (role === "owner") return (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neon-purple/10 text-neon-purple border border-neon-purple/30">Owner</span>);
  return (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neon-blue/10 text-neon-blue border border-neon-blue/30">Kasir</span>);
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function PengaturanPage() {
  const { activeBranchId, isOwner, profile } = useUser();
  const { facilities } = useRealtimeFacilities(activeBranchId);
  const { categoryNames } = useFacilityCategories();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<"fasilitas" | "cabang" | "staff" | "menu" | "tools" | "shifts">("fasilitas");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const supabase = createClient();

  // ── QR State ───────────────────────────────────────────────
  const [qrFacility, setQrFacility] = useState<Facility | null>(null);

  // ── Menu State ─────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuCategory, setNewMenuCategory] = useState<"fnb" | "extra_time">("fnb");
  const [newMenuPrice, setNewMenuPrice] = useState("");
  const [editMenuId, setEditMenuId] = useState<string | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState<"fnb" | "extra_time">("fnb");
  const [editMenuPrice, setEditMenuPrice] = useState("");

  // ── Fasilitas State ────────────────────────────────────────
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacName, setNewFacName] = useState("");
  const [newFacCategory, setNewFacCategory] = useState("PS4");
  const [newFacPrice, setNewFacPrice] = useState("");
  const [newFacBooth, setNewFacBooth] = useState("");
  const [editingFacId, setEditingFacId] = useState<string | null>(null);
  const [editFacName, setEditFacName] = useState("");
  const [editFacPrice, setEditFacPrice] = useState("");
  const [editFacBooth, setEditFacBooth] = useState("");
  // Edit detail (games, perks & description)
  const [editDetailFac, setEditDetailFac] = useState<Facility | null>(null);
  const [editDetailGames, setEditDetailGames] = useState<string[]>([]);
  const [editDetailPerks, setEditDetailPerks] = useState<string[]>([]);
  const [editDetailDesc, setEditDetailDesc] = useState("");
  const [editDetailNewGame, setEditDetailNewGame] = useState("");
  const [editDetailNewPerk, setEditDetailNewPerk] = useState("");

  // ── Cabang State ───────────────────────────────────────────
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBrName, setNewBrName] = useState("");
  const [newBrSlug, setNewBrSlug] = useState("");
  const [newBrAddress, setNewBrAddress] = useState("");
  const [newBrPhone, setNewBrPhone] = useState("");
  const [newBrHours, setNewBrHours] = useState("10:00-22:00");
  const [newBrMaps, setNewBrMaps] = useState("");
  const [branchImageFile, setBranchImageFile] = useState<File | null>(null);
  const [branchImagePreview, setBranchImagePreview] = useState<string | null>(null);
  // Edit existing branch
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBrName, setEditBrName] = useState("");
  const [editBrAddress, setEditBrAddress] = useState("");
  const [editBrPhone, setEditBrPhone] = useState("");
  const [editBrHours, setEditBrHours] = useState("");
  const [editBrMaps, setEditBrMaps] = useState("");

  // ── Staff State ────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [staffError, setStaffError] = useState("");
  // Add staff form
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"cashier" | "owner">("cashier");
  const [addBranchId, setAddBranchId] = useState("");
  const [showAddPw, setShowAddPw] = useState(false);
  // Edit staff form
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"cashier" | "owner">("cashier");
  const [editBranchId, setEditBranchId] = useState("");

  // ── Fetch branches ─────────────────────────────────────────
  useEffect(() => {
    async function fetchBranches() {
      const r = await fetch("/api/branches");
      if (r.ok) { const d = await r.json(); setBranches(d.branches || []); }
    }
    fetchBranches();
  }, []);

  // ── Fetch menu items ───────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "menu" || !activeBranchId) return;
    let cancelled = false;
    fetch(`/api/menu-items?branch_id=${activeBranchId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (!cancelled) setMenuItems(d.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMenuLoading(false); });
    return () => {
      cancelled = true;
      setMenuLoading(true); // Reset spinner for next time tab is opened
    };
  }, [activeTab, activeBranchId]);

  // ── Fetch staff ────────────────────────────────────────────
  // Used by refresh button (called from event handler, setState allowed synchronously)
  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const r = await fetch("/api/staff");
      if (r.ok) { const d = await r.json(); setStaffList(d.staff || []); }
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // Tab-switch triggered fetch — setState only in .then()/.finally() callbacks (async, not synchronous)
  useEffect(() => {
    if (activeTab !== "staff") return;
    let cancelled = false;
    fetch("/api/staff")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (!cancelled) setStaffList(d.staff || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStaffLoading(false); });
    return () => {
      cancelled = true;
      setStaffLoading(true); // Reset for next time tab is opened (cleanup is safe)
    };
  }, [activeTab]);

  // ── Fasilitas Handlers ─────────────────────────────────────
  const handleAddFacility = useCallback(async () => {
    if (!newFacName || !newFacPrice) return; setLoadingAction("add-facility");
    try { const r = await fetch("/api/facilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newFacName, category: newFacCategory, price_per_hour: parseInt(newFacPrice), booth_number: newFacBooth || null }) }); if (r.ok) { setNewFacName(""); setNewFacPrice(""); setNewFacBooth(""); setShowAddFacility(false); } else { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [newFacName, newFacCategory, newFacPrice, newFacBooth]);

  const handleToggleMaintenance = useCallback(async (fac: Facility) => {
    const ns = fac.status === "maintenance" ? "available" : "maintenance"; setLoadingAction(fac.id);
    try { const r = await fetch(`/api/facilities/${fac.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) }); if (!r.ok) { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, []);

  const handleUpdateFacility = useCallback(async (id: string) => {
    setLoadingAction(id);
    try { const r = await fetch(`/api/facilities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editFacName, price_per_hour: parseInt(editFacPrice), booth_number: editFacBooth || null }) }); if (r.ok) setEditingFacId(null); else { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [editFacName, editFacPrice, editFacBooth]);

  const handleDeleteFacility = useCallback(async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus "${name}"?`)) return; setLoadingAction(id);
    try { const r = await fetch(`/api/facilities/${id}`, { method: "DELETE" }); if (!r.ok) { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, []);

  const openEditDetail = (fac: Facility) => {
    setEditDetailFac(fac);
    setEditDetailGames(fac.games ?? []);
    setEditDetailPerks(fac.perks ?? []);
    setEditDetailDesc(fac.description ?? "");
    setEditDetailNewGame("");
    setEditDetailNewPerk("");
  };

  const handleSaveDetail = useCallback(async () => {
    if (!editDetailFac) return;
    setLoadingAction("edit-detail");
    try {
      const r = await fetch(`/api/facilities/${editDetailFac.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: editDetailGames, perks: editDetailPerks, description: editDetailDesc || null }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error); return; }
      setEditDetailFac(null);
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [editDetailFac, editDetailGames, editDetailPerks, editDetailDesc]);

  // ── Cabang Handlers ────────────────────────────────────────
  const handleBranchImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setBranchImageFile(f); setBranchImagePreview(URL.createObjectURL(f)); } };

  const handleAddBranch = useCallback(async () => {
    if (!newBrName || !newBrSlug) return; setLoadingAction("add-branch");
    try {
      if (branchImageFile) { const ext = branchImageFile.name.split(".").pop(); const fp = `branches/${newBrSlug}-${Date.now()}.${ext}`; await supabase.storage.from("facility-images").upload(fp, branchImageFile, { upsert: true }); }
      const r = await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBrName, slug: newBrSlug, address: newBrAddress, phone: newBrPhone, operating_hours: newBrHours, google_maps_url: newBrMaps || null }) });
      if (r.ok) { const d = await r.json(); setBranches(p => [...p, d.branch]); setNewBrName(""); setNewBrSlug(""); setNewBrAddress(""); setNewBrPhone(""); setNewBrHours("10:00-22:00"); setNewBrMaps(""); setBranchImageFile(null); setBranchImagePreview(null); setShowAddBranch(false); } else { const d = await r.json(); alert(d.error); }
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [newBrName, newBrSlug, newBrAddress, newBrPhone, newBrHours, newBrMaps, branchImageFile, supabase]);

  const handleToggleBranch = useCallback(async (branch: Branch) => {
    setLoadingAction(branch.id);
    try { const r = await fetch(`/api/branches/${branch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !branch.is_active }) }); if (r.ok) setBranches(p => p.map(b => b.id === branch.id ? { ...b, is_active: !b.is_active } : b)); else { const d = await r.json(); alert(d.error); } } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, []);

  const openEditBranch = useCallback((branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditBrName(branch.name);
    setEditBrAddress(branch.address ?? "");
    setEditBrPhone(branch.phone ?? "");
    setEditBrHours(branch.operating_hours ?? "");
    setEditBrMaps(branch.google_maps_url ?? "");
  }, []);

  const handleSaveBranch = useCallback(async () => {
    if (!editingBranchId || !editBrName.trim()) return;
    setLoadingAction(`edit-branch-${editingBranchId}`);
    try {
      const r = await fetch(`/api/branches/${editingBranchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBrName.trim(),
          address: editBrAddress.trim() || null,
          phone: editBrPhone.trim() || null,
          operating_hours: editBrHours.trim() || null,
          google_maps_url: editBrMaps.trim() || null,
        }),
      });
      if (r.ok) {
        const { branch: updated } = await r.json();
        setBranches(p => p.map(b => b.id === editingBranchId ? updated : b));
        setEditingBranchId(null);
      } else {
        const d = await r.json();
        alert(d.error ?? "Gagal menyimpan");
      }
    } catch { alert("Network error"); }
    finally { setLoadingAction(null); }
  }, [editingBranchId, editBrName, editBrAddress, editBrPhone, editBrHours, editBrMaps]);

  // ── Staff Handlers ─────────────────────────────────────────
  const handleAddStaff = useCallback(async () => {
    setStaffError("");
    if (!addName || !addEmail || !addPassword || !addBranchId) { setStaffError("Semua field wajib diisi"); return; }
    if (addPassword.length < 6) { setStaffError("Password minimal 6 karakter"); return; }
    setLoadingAction("add-staff");
    try {
      const r = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: addName, email: addEmail, password: addPassword, role: addRole, branch_id: addBranchId }),
      });
      const d = await r.json();
      if (!r.ok) { setStaffError(d.error || "Gagal menambah akun"); return; }
      setShowAddStaff(false);
      setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("cashier"); setAddBranchId("");
      await loadStaff();
    } catch { setStaffError("Network error"); } finally { setLoadingAction(null); }
  }, [addName, addEmail, addPassword, addRole, addBranchId, loadStaff]);

  const handleEditStaff = useCallback(async () => {
    if (!editStaff) return;
    setStaffError("");
    setLoadingAction("edit-staff");
    try {
      const r = await fetch(`/api/staff/${editStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, role: editRole, branch_id: editBranchId }),
      });
      const d = await r.json();
      if (!r.ok) { setStaffError(d.error || "Gagal memperbarui akun"); return; }
      setEditStaff(null);
      await loadStaff();
    } catch { setStaffError("Network error"); } finally { setLoadingAction(null); }
  }, [editStaff, editName, editRole, editBranchId, loadStaff]);

  const handleDeleteStaff = useCallback(async (s: StaffMember) => {
    if (!confirm(`Hapus akun "${s.full_name}" (${s.email})?\n\nAkun ini tidak bisa dipulihkan.`)) return;
    setLoadingAction(s.id);
    try {
      const r = await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { alert(d.error); return; }
      await loadStaff();
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [loadStaff]);

  const openEditStaff = (s: StaffMember) => {
    setEditStaff(s);
    setEditName(s.full_name);
    setEditRole(s.role);
    setEditBranchId(s.branch_id || "");
    setStaffError("");
  };

  const openAddStaff = () => {
    setShowAddStaff(true);
    setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("cashier");
    setAddBranchId(branches[0]?.id || "");
    setStaffError("");
  };

  // ── Menu Handlers ──────────────────────────────────────────
  const handleAddMenu = useCallback(async () => {
    if (!newMenuName || !newMenuPrice) return;
    setLoadingAction("add-menu");
    try {
      const r = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMenuName, category: newMenuCategory, price: parseInt(newMenuPrice) }),
      });
      if (r.ok) {
        const d = await r.json();
        setMenuItems(prev => [...prev, d.item]);
        setNewMenuName(""); setNewMenuPrice(""); setShowAddMenu(false);
      } else { const d = await r.json(); alert(d.error); }
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [newMenuName, newMenuCategory, newMenuPrice]);

  const handleUpdateMenu = useCallback(async (id: string) => {
    setLoadingAction(id);
    try {
      const r = await fetch(`/api/menu-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editMenuName, category: editMenuCategory, price: parseInt(editMenuPrice) }),
      });
      if (r.ok) {
        const d = await r.json();
        setMenuItems(prev => prev.map(m => m.id === id ? d.item : m));
        setEditMenuId(null);
      } else { const d = await r.json(); alert(d.error); }
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, [editMenuName, editMenuCategory, editMenuPrice]);

  const handleToggleMenuAvailability = useCallback(async (item: MenuItem) => {
    setLoadingAction(item.id);
    try {
      const r = await fetch(`/api/menu-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (r.ok) {
        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m));
      } else { const d = await r.json(); alert(d.error); }
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, []);

  const handleDeleteMenu = useCallback(async (id: string, name: string) => {
    if (!confirm(`Hapus menu "${name}"?`)) return;
    setLoadingAction(id);
    try {
      const r = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
      if (r.ok) { setMenuItems(prev => prev.filter(m => m.id !== id)); }
      else { const d = await r.json(); alert(d.error); }
    } catch { alert("Network error"); } finally { setLoadingAction(null); }
  }, []);

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-white tracking-wide">Pengaturan Sistem</h1><p className="text-sm text-slate-400 mt-1">Kelola fasilitas, cabang, dan akun staff secara real-time.</p></div>

      {/* TAB SELECTOR */}
      <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit flex-wrap">
        {([
          { key: "fasilitas", label: "Kelola Fasilitas", icon: <SvgMonitor /> },
          { key: "cabang", label: "Kelola Cabang", icon: <SvgBuilding /> },
          { key: "menu", label: "Kelola Menu", icon: <SvgChefHat /> },
          ...(isOwner ? [{ key: "staff", label: "Kelola Staff", icon: <SvgUsers /> }] : []),
          ...(isOwner ? [{ key: "tools", label: "Power Tools", icon: <SvgZap /> }] : []),
          ...(isOwner ? [{ key: "shifts", label: "Kelola Shift", icon: <SvgClock /> }] : []),
        ] as { key: "fasilitas" | "cabang" | "menu" | "staff" | "tools" | "shifts"; label: string; icon: React.ReactNode }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]" : "text-slate-400 hover:text-white"}`}>{tab.icon}{tab.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: FASILITAS
      ══════════════════════════════════════════════════════ */}
      {activeTab === "fasilitas" && (
        <div className="space-y-4">
          {isOwner && <button onClick={() => setShowAddFacility(!showAddFacility)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"><SvgPlus />Tambah Fasilitas</button>}
          {showAddFacility && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-neon-purple/30 rounded-xl p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><SvgPlus />Tambah Fasilitas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Nama</label><input value={newFacName} onChange={e => setNewFacName(e.target.value)} placeholder="PS5 VIP Room 3" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">No. Bilik</label><input value={newFacBooth} onChange={e => setNewFacBooth(e.target.value)} placeholder="Bilik 1" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Kategori</label><select value={newFacCategory} onChange={e => setNewFacCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none appearance-none [&>option]:bg-slate-900">{categoryNames.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Harga/Jam</label><div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-neon-purple/50"><span className="px-3 py-2.5 bg-slate-900 border-r border-slate-800 text-sm font-bold text-slate-500">Rp</span><input type="number" value={newFacPrice} onChange={e => setNewFacPrice(e.target.value)} placeholder="15000" className="w-full bg-transparent border-none px-3 py-2.5 text-sm text-white outline-none font-mono" /></div></div>
                <div className="flex items-end"><button onClick={handleAddFacility} disabled={loadingAction === "add-facility" || !newFacName || !newFacPrice} className="w-full py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1">{loadingAction === "add-facility" ? <SvgLoader /> : <SvgCheck />} Simpan</button></div>
              </div>
            </div>
          )}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between"><h3 className="text-sm font-bold text-white flex items-center gap-2"><SvgMonitor />Daftar Fasilitas ({facilities.length})</h3><span className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Real-time</span></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-800"><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nama</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">No. Bilik</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Kategori</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Harga/Jam</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th><th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Aksi</th></tr></thead>
                <tbody>
                  {facilities.map(fac => (
                    <tr key={fac.id} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">{editingFacId === fac.id ? <input value={editFacName} onChange={e => setEditFacName(e.target.value)} className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-sm text-white outline-none w-36" /> : <span className="text-sm font-semibold text-white">{fac.name}</span>}</td>
                      <td className="px-4 py-3">{editingFacId === fac.id ? <input value={editFacBooth} onChange={e => setEditFacBooth(e.target.value)} placeholder="Bilik 1" className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-sm text-white outline-none w-20" /> : <span className="text-xs font-bold text-neon-purple font-mono">{fac.booth_number ?? <span className="text-slate-600">—</span>}</span>}</td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-400 font-mono">{fac.category}</span></td>
                      <td className="px-4 py-3">{editingFacId === fac.id ? <div className="flex items-center gap-1"><span className="text-xs text-slate-500">Rp</span><input type="number" value={editFacPrice} onChange={e => setEditFacPrice(e.target.value)} className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-sm text-white outline-none w-24 font-mono" /></div> : <span className="text-sm text-white font-mono">Rp {fac.price_per_hour.toLocaleString("id-ID")}</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={fac.status} /></td>
                      <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                        {editingFacId === fac.id ? (<><button onClick={() => handleUpdateFacility(fac.id)} disabled={loadingAction === fac.id} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50">{loadingAction === fac.id ? "..." : "Simpan"}</button><button onClick={() => setEditingFacId(null)} className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700">Batal</button></>) : (<>
                          {isOwner && <button onClick={() => { setEditingFacId(fac.id); setEditFacName(fac.name); setEditFacPrice(fac.price_per_hour.toString()); setEditFacBooth(fac.booth_number ?? ""); }} className="p-1.5 rounded-lg text-slate-400 hover:text-neon-blue hover:bg-neon-blue/10 transition-all" title="Edit Nama & Harga"><SvgPencil /></button>}
                          {isOwner && <button onClick={() => openEditDetail(fac)} className="p-1.5 rounded-lg text-slate-400 hover:text-neon-purple hover:bg-neon-purple/10 transition-all" title="Edit Game & Fasilitas"><SvgList /></button>}
                          <button onClick={() => setQrFacility(fac)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" title="QR Code Bilik"><SvgQrCode /></button>
                          <button onClick={() => handleToggleMaintenance(fac)} disabled={loadingAction === fac.id || fac.status === "active"} className={`p-1.5 rounded-lg transition-all disabled:opacity-30 ${fac.status === "maintenance" ? "text-emerald-400 hover:bg-emerald-500/10" : "text-amber-400 hover:bg-amber-500/10"}`} title={fac.status === "maintenance" ? "Aktifkan" : "Nonaktifkan"}>{fac.status === "maintenance" ? <SvgCheck /> : <SvgWrench />}</button>
                          {isOwner && <button onClick={() => handleDeleteFacility(fac.id, fac.name)} disabled={loadingAction === fac.id || fac.status === "active"} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30" title="Hapus"><SvgTrash /></button>}
                        </>)}
                      </div></td>
                    </tr>
                  ))}
                  {facilities.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-slate-500">Belum ada fasilitas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: CABANG
      ══════════════════════════════════════════════════════ */}
      {activeTab === "cabang" && (
        <div className="space-y-4">
          {isOwner && <button onClick={() => setShowAddBranch(!showAddBranch)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-blue to-emerald-500 text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"><SvgPlus />Tambah Cabang Baru</button>}
          {showAddBranch && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-neon-blue/30 rounded-xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><SvgBuilding />Tambah Cabang Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Nama Cabang *</label><input value={newBrName} onChange={e => { setNewBrName(e.target.value); setNewBrSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="69Game - Tembalang" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-blue/50 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Slug (URL) *</label><input value={newBrSlug} onChange={e => setNewBrSlug(e.target.value)} placeholder="69game-tembalang" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:border-neon-blue/50 outline-none" /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Alamat</label><textarea value={newBrAddress} onChange={e => setNewBrAddress(e.target.value)} placeholder="Jl. Prof. Sudarto No. 13, Tembalang" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-blue/50 outline-none min-h-[60px]" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">No. Telepon</label><input value={newBrPhone} onChange={e => setNewBrPhone(e.target.value)} placeholder="081234567890" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-blue/50 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Jam Operasional</label><input value={newBrHours} onChange={e => setNewBrHours(e.target.value)} placeholder="10:00-22:00" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-blue/50 outline-none" /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Google Maps URL</label><input value={newBrMaps} onChange={e => setNewBrMaps(e.target.value)} placeholder="https://maps.google.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-blue/50 outline-none" /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Foto Cabang</label><label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-neon-blue/50 hover:bg-neon-blue/5 transition-all group"><input type="file" accept="image/*" onChange={handleBranchImageChange} className="hidden" />{branchImagePreview ? <img src={branchImagePreview} alt="Preview" className="w-full max-h-32 object-cover rounded-lg" /> : <><span className="text-slate-500 group-hover:text-neon-blue"><SvgUpload /></span><span className="text-xs text-slate-500 mt-2 group-hover:text-slate-400">Klik untuk upload foto</span></>}</label></div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button onClick={() => setShowAddBranch(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">Batal</button>
                  <button onClick={handleAddBranch} disabled={loadingAction === "add-branch" || !newBrName || !newBrSlug} className="px-6 py-2 rounded-lg bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-sm font-bold hover:bg-neon-blue/30 disabled:opacity-50 transition-all flex items-center gap-1">{loadingAction === "add-branch" ? <SvgLoader /> : <SvgCheck />} Simpan</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(branch => {
              const isEditing = editingBranchId === branch.id;
              const saving = loadingAction === `edit-branch-${branch.id}`;
              return (
                <div key={branch.id} className={`bg-slate-900/50 backdrop-blur-md border rounded-xl p-5 transition-all ${branch.is_active ? "border-slate-800 hover:border-emerald-500/30" : "border-red-500/20 opacity-60"}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${branch.is_active ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                      <h3 className="text-sm font-bold text-white">{branch.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && !isEditing && (
                        <button
                          onClick={() => openEditBranch(branch)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-neon-blue hover:bg-neon-blue/10 transition-all"
                          title="Edit info cabang"
                        >
                          <SvgPencil />
                        </button>
                      )}
                      {isOwner && <Toggle enabled={branch.is_active} onChange={() => handleToggleBranch(branch)} disabled={loadingAction === branch.id} />}
                    </div>
                  </div>

                  {isEditing ? (
                    /* ── Edit form ── */
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Nama Cabang *</label>
                        <input value={editBrName} onChange={e => setEditBrName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/60 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Alamat</label>
                        <input value={editBrAddress} onChange={e => setEditBrAddress(e.target.value)} placeholder="Jl. Contoh No.1, Semarang" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/60 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">No. HP / WA</label>
                          <input value={editBrPhone} onChange={e => setEditBrPhone(e.target.value)} placeholder="08xx" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/60 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Jam Operasional</label>
                          <input value={editBrHours} onChange={e => setEditBrHours(e.target.value)} placeholder="08:00-24:00" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/60 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Link Google Maps</label>
                        <input value={editBrMaps} onChange={e => setEditBrMaps(e.target.value)} placeholder="https://maps.google.com/..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/60 outline-none" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditingBranchId(null)} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-all">Batal</button>
                        <button onClick={handleSaveBranch} disabled={saving || !editBrName.trim()} className="flex-[2] py-2 rounded-lg bg-neon-purple/15 border border-neon-purple/40 text-neon-purple text-xs font-bold hover:bg-neon-purple/25 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                          {saving ? <SvgLoader /> : <SvgCheck />} Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display mode ── */
                    <>
                      {branch.address && <div className="flex items-start gap-2 text-xs text-slate-400 mb-2"><SvgMapPin /><span>{branch.address}</span></div>}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                        {branch.phone && <span>📱 {branch.phone}</span>}
                        <span>🕐 {branch.operating_hours}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 font-mono">{branch.slug}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${branch.is_active ? "text-emerald-500" : "text-red-500"}`}>{branch.is_active ? "● Aktif" : "● Nonaktif"}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {branches.length === 0 && <div className="col-span-2 text-center py-12 text-sm text-slate-500">Belum ada cabang.</div>}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: KELOLA STAFF (Owner only)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "staff" && isOwner && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Semua akun kasir dan owner di seluruh cabang.</p>
            <button onClick={openAddStaff} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <SvgPlus />Tambah Akun Staff
            </button>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><SvgUsers />Daftar Akun Staff ({staffList.length})</h3>
              <button onClick={loadStaff} disabled={staffLoading} className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-white transition-colors disabled:opacity-50">
                {staffLoading ? "Memuat..." : "↻ Refresh"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nama</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Email Login</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Cabang</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {staffLoading && (
                    <tr><td colSpan={5} className="text-center py-8"><div className="flex items-center justify-center gap-2 text-slate-500 text-sm"><SvgLoader />Memuat data staff...</div></td></tr>
                  )}
                  {!staffLoading && staffList.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{s.full_name}</p>
                          {s.id === profile?.id && <span className="text-[10px] text-neon-purple font-bold">● Akun Anda</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-300 font-mono">{s.email || "-"}</span></td>
                      <td className="px-4 py-3"><RoleBadge role={s.role} /></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-400">{s.branch_name}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditStaff(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-neon-blue hover:bg-neon-blue/10 transition-all" title="Edit"><SvgPencil /></button>
                          <button onClick={() => handleDeleteStaff(s)} disabled={loadingAction === s.id || s.id === profile?.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30" title={s.id === profile?.id ? "Tidak bisa hapus akun sendiri" : "Hapus"}>{loadingAction === s.id ? <SvgLoader /> : <SvgTrash />}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!staffLoading && staffList.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-sm text-slate-500">Belum ada akun staff.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 4: KELOLA MENU
      ══════════════════════════════════════════════════════ */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Menu F&B dan paket waktu tambahan yang bisa dipesan pelanggan via QR.</p>
            <button onClick={() => setShowAddMenu(!showAddMenu)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"><SvgPlus />Tambah Menu</button>
          </div>

          {showAddMenu && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-neon-purple/30 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><SvgChefHat />Tambah Item Menu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Nama Menu</label><input value={newMenuName} onChange={e => setNewMenuName(e.target.value)} placeholder="Es Teh Manis" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Kategori</label><select value={newMenuCategory} onChange={e => setNewMenuCategory(e.target.value as "fnb" | "extra_time")} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none appearance-none [&>option]:bg-slate-900"><option value="fnb">F&B</option><option value="extra_time">Extra Waktu</option></select></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Harga</label><div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-neon-purple/50"><span className="px-3 py-2.5 bg-slate-900 border-r border-slate-800 text-sm font-bold text-slate-500">Rp</span><input type="number" value={newMenuPrice} onChange={e => setNewMenuPrice(e.target.value)} placeholder="10000" className="w-full bg-transparent border-none px-3 py-2.5 text-sm text-white outline-none font-mono" /></div></div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowAddMenu(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">Batal</button>
                <button onClick={handleAddMenu} disabled={loadingAction === "add-menu" || !newMenuName || !newMenuPrice} className="px-6 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1">{loadingAction === "add-menu" ? <SvgLoader /> : <SvgCheck />} Simpan</button>
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800"><h3 className="text-sm font-bold text-white flex items-center gap-2"><SvgChefHat />Daftar Menu ({menuItems.length})</h3></div>
            {menuLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm"><SvgLoader />Memuat menu...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-800"><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nama</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Kategori</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Harga</th><th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tersedia</th><th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Aksi</th></tr></thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id} className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">{editMenuId === item.id ? <input value={editMenuName} onChange={e => setEditMenuName(e.target.value)} className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-sm text-white outline-none w-40" /> : <span className="text-sm font-semibold text-white">{item.name}</span>}</td>
                        <td className="px-4 py-3">{editMenuId === item.id ? <select value={editMenuCategory} onChange={e => setEditMenuCategory(e.target.value as "fnb" | "extra_time")} className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-xs text-white outline-none appearance-none [&>option]:bg-slate-900"><option value="fnb">F&B</option><option value="extra_time">Extra Waktu</option></select> : <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.category === "fnb" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"}`}>{item.category === "fnb" ? "F&B" : "Extra Waktu"}</span>}</td>
                        <td className="px-4 py-3">{editMenuId === item.id ? <div className="flex items-center gap-1"><span className="text-xs text-slate-500">Rp</span><input type="number" value={editMenuPrice} onChange={e => setEditMenuPrice(e.target.value)} className="bg-slate-950 border border-neon-purple/50 rounded px-2 py-1 text-sm text-white outline-none w-24 font-mono" /></div> : <span className="text-sm text-white font-mono">Rp {item.price.toLocaleString("id-ID")}</span>}</td>
                        <td className="px-4 py-3"><Toggle enabled={item.is_available} onChange={() => handleToggleMenuAvailability(item)} disabled={loadingAction === item.id} /></td>
                        <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                          {editMenuId === item.id ? (<><button onClick={() => handleUpdateMenu(item.id)} disabled={loadingAction === item.id} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50">{loadingAction === item.id ? "..." : "Simpan"}</button><button onClick={() => setEditMenuId(null)} className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-700">Batal</button></>) : (<>
                            <button onClick={() => { setEditMenuId(item.id); setEditMenuName(item.name); setEditMenuCategory(item.category); setEditMenuPrice(item.price.toString()); }} className="p-1.5 rounded-lg text-slate-400 hover:text-neon-blue hover:bg-neon-blue/10 transition-all" title="Edit"><SvgPencil /></button>
                            <button onClick={() => handleDeleteMenu(item.id, item.name)} disabled={loadingAction === item.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30" title="Hapus"><SvgTrash /></button>
                          </>)}
                        </div></td>
                      </tr>
                    ))}
                    {menuItems.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-slate-500">Belum ada item menu. Tambahkan menu F&B atau paket waktu.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: TAMBAH AKUN STAFF
      ══════════════════════════════════════════════════════ */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Tambah Akun Staff</h2>
                <p className="text-xs text-slate-400 mt-0.5">Buat akun login untuk kasir atau owner baru.</p>
              </div>
              <button onClick={() => setShowAddStaff(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><SvgX /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Nama Lengkap *</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Budi Santoso" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Email Login *</label>
                <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="kasir@69game.id" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none transition-colors font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Password *</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-neon-purple/60 transition-colors">
                  <input type={showAddPw ? "text" : "password"} value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Min. 6 karakter" className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white outline-none" />
                  <button type="button" onClick={() => setShowAddPw(p => !p)} className="px-3 text-slate-500 hover:text-white transition-colors">{showAddPw ? <SvgEyeOff /> : <SvgEye />}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Role *</label>
                  <select value={addRole} onChange={e => setAddRole(e.target.value as "cashier" | "owner")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none appearance-none [&>option]:bg-slate-900">
                    <option value="cashier">Kasir</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Cabang *</label>
                  <select value={addBranchId} onChange={e => setAddBranchId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none appearance-none [&>option]:bg-slate-900">
                    <option value="">Pilih cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {staffError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{staffError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddStaff(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800">Batal</button>
              <button onClick={handleAddStaff} disabled={loadingAction === "add-staff"} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                {loadingAction === "add-staff" ? <><SvgLoader />Membuat...</> : <><SvgCheck />Buat Akun</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: EDIT AKUN STAFF
      ══════════════════════════════════════════════════════ */}
      {editStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Akun Staff</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{editStaff.email}</p>
              </div>
              <button onClick={() => setEditStaff(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><SvgX /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Nama Lengkap</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Role</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value as "cashier" | "owner")} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none appearance-none [&>option]:bg-slate-900">
                    <option value="cashier">Kasir</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Cabang</label>
                  <select value={editBranchId} onChange={e => setEditBranchId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-neon-purple/60 outline-none appearance-none [&>option]:bg-slate-900">
                    <option value="">Pilih cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-3.5 py-2.5 text-xs text-slate-500">
                Untuk mengubah password atau email, lakukan langsung di Supabase Dashboard.
              </div>

              {staffError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{staffError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditStaff(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800">Batal</button>
              <button onClick={handleEditStaff} disabled={loadingAction === "edit-staff"} className="flex-1 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple border border-neon-purple/30 text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:bg-neon-purple/30">
                {loadingAction === "edit-staff" ? <><SvgLoader />Menyimpan...</> : <><SvgCheck />Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 5: POWER TOOLS (Owner only)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "tools" && activeBranchId && (
        <PowerToolsTab branchId={activeBranchId} />
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 6: KELOLA SHIFT (Owner only)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "shifts" && isOwner && (
        <ShiftManagerTab branchId={activeBranchId} />
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: EDIT GAME & FASILITAS
      ══════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════
          MODAL: QR CODE BILIK
      ══════════════════════════════════════════════════════ */}
      {qrFacility && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setQrFacility(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <h2 className="text-base font-bold text-white">QR Code Bilik</h2>
                <p className="text-xs text-slate-400 mt-0.5">{qrFacility.name}{qrFacility.booth_number ? ` · ${qrFacility.booth_number}` : ""}</p>
              </div>
              <button onClick={() => setQrFacility(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"><SvgX /></button>
            </div>

            <div className="bg-white rounded-2xl p-4 inline-block mb-4">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/meja/${qrFacility.id}`}
                size={180}
                level="M"
              />
            </div>

            <p className="text-[10px] text-slate-600 font-mono break-all mb-4">/meja/{qrFacility.id}</p>
            <p className="text-[11px] text-slate-500 mb-5">Scan QR ini untuk memesan F&B atau menghubungi kasir dari bilik.</p>

            <div className="flex gap-3">
              <button onClick={() => setQrFacility(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800">Tutup</button>
              <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple border border-neon-purple/30 text-sm font-bold hover:bg-neon-purple/30 transition-all">Print</button>
            </div>
          </div>
        </div>
      )}

      {editDetailFac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditDetailFac(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(168,85,247,0.2)] flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neon-purple block mb-0.5">Edit Konten Fasilitas</span>
                <h3 className="text-base font-bold text-white">{editDetailFac.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Perubahan langsung tampil di halaman Fasilitas publik</p>
              </div>
              <button onClick={() => setEditDetailFac(null)} className="text-slate-500 hover:text-white transition-colors p-1"><SvgX /></button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-8">

              {/* ── DESKRIPSI TAMBAHAN ───────────────────── */}
              <div>
                <p className="text-sm font-bold text-white mb-1">Informasi Tambahan Bilik</p>
                <p className="text-[11px] text-slate-500 mb-3">Catatan atau keterangan khusus yang ditampilkan di kartu ruangan (spek layar, kondisi, dll.)</p>
                <textarea
                  value={editDetailDesc}
                  onChange={e => setEditDetailDesc(e.target.value)}
                  placeholder='Contoh: TV Samsung 55" OLED, kursi gaming premium, AC split dingin.'
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="border-t border-white/8" />

              {/* ── PERKS ─────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">Yang Didapat (Fasilitas)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Daftar perangkat dan fasilitas yang termasuk dalam sesi ini</p>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{editDetailPerks.length} item</span>
                </div>

                {/* Perks list */}
                <div className="space-y-1.5 mb-3">
                  {editDetailPerks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-neon-purple"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                      <span className="flex-1 text-sm text-slate-200">{perk}</span>
                      <button
                        onClick={() => setEditDetailPerks(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  {editDetailPerks.length === 0 && (
                    <p className="text-xs text-slate-600 italic py-2">Belum ada fasilitas ditambahkan</p>
                  )}
                </div>

                {/* Add perk input */}
                <div className="flex gap-2">
                  <input
                    value={editDetailNewPerk}
                    onChange={e => setEditDetailNewPerk(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && editDetailNewPerk.trim()) {
                        setEditDetailPerks(prev => [...prev, editDetailNewPerk.trim()]);
                        setEditDetailNewPerk("");
                      }
                    }}
                    placeholder='Contoh: TV 55" 4K HDR'
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/50 outline-none placeholder:text-slate-600"
                  />
                  <button
                    onClick={() => {
                      if (editDetailNewPerk.trim()) {
                        setEditDetailPerks(prev => [...prev, editDetailNewPerk.trim()]);
                        setEditDetailNewPerk("");
                      }
                    }}
                    disabled={!editDetailNewPerk.trim()}
                    className="px-4 py-2 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/30 text-sm font-bold hover:bg-neon-purple/20 disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    <SvgPlus />Tambah
                  </button>
                </div>
              </div>

              <div className="border-t border-white/8" />

              {/* ── GAMES ─────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white">Daftar Game</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Judul game yang tersedia untuk fasilitas ini</p>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{editDetailGames.length} judul</span>
                </div>

                {/* Games pills */}
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[40px]">
                  {editDetailGames.map((game, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 group"
                    >
                      {game}
                      <button
                        onClick={() => setEditDetailGames(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </span>
                  ))}
                  {editDetailGames.length === 0 && (
                    <p className="text-xs text-slate-600 italic py-1">Belum ada game ditambahkan</p>
                  )}
                </div>

                {/* Add game input */}
                <div className="flex gap-2">
                  <input
                    value={editDetailNewGame}
                    onChange={e => setEditDetailNewGame(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && editDetailNewGame.trim()) {
                        setEditDetailGames(prev => [...prev, editDetailNewGame.trim()]);
                        setEditDetailNewGame("");
                      }
                    }}
                    placeholder="Contoh: EA FC 25"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-purple/50 outline-none placeholder:text-slate-600"
                  />
                  <button
                    onClick={() => {
                      if (editDetailNewGame.trim()) {
                        setEditDetailGames(prev => [...prev, editDetailNewGame.trim()]);
                        setEditDetailNewGame("");
                      }
                    }}
                    disabled={!editDetailNewGame.trim()}
                    className="px-4 py-2 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/30 text-sm font-bold hover:bg-neon-purple/20 disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    <SvgPlus />Tambah
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">Tekan Enter atau klik Tambah untuk menambah judul game</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
              <button onClick={() => setEditDetailFac(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800">
                Batal
              </button>
              <button
                onClick={handleSaveDetail}
                disabled={loadingAction === "edit-detail"}
                className="flex-1 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple border border-neon-purple/30 text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:bg-neon-purple/30"
              >
                {loadingAction === "edit-detail" ? <><SvgLoader />Menyimpan...</> : <><SvgCheck />Simpan Perubahan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
