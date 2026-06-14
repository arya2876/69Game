"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFacilityCategories } from "@/lib/hooks/useFacilityCategories";
import type { FacilityCategory } from "@/lib/hooks/useFacilityCategories";

// ── TYPES ───────────────────────────────────────────────────
export interface RoomRate {
  id: string;
  branch_id: string;
  facility_category: string;
  label: string;
  duration_hours: number;
  base_price: number;
  is_discount_active: boolean;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

interface PromoFormData {
  rateId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
}

// ── SVG ICONS ───────────────────────────────────────────────
const SvgZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SvgGear = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SvgTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const SvgPercent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const SvgDollar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const SvgX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SvgCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SvgLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ── TOGGLE COMPONENT ────────────────────────────────────────
function PromoToggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        enabled
          ? "bg-neon-purple shadow-[0_0_12px_rgba(168,85,247,0.6)]"
          : "bg-slate-700 hover:bg-slate-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </div>
  );
}

// ── PROMO CONFIG MODAL ──────────────────────────────────────
function PromoConfigModal({
  rates,
  editingRate,
  onClose,
  onSave,
  saving,
}: {
  rates: RoomRate[];
  editingRate: RoomRate | null;
  onClose: () => void;
  onSave: (data: PromoFormData) => void;
  saving: boolean;
}) {
  const [selectedRateId, setSelectedRateId] = useState(editingRate?.id || "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    editingRate?.discount_type || "percentage"
  );
  const [discountValue, setDiscountValue] = useState(
    editingRate?.discount_value?.toString() || ""
  );

  useEffect(() => {
    if (editingRate) {
      setSelectedRateId(editingRate.id);
      setDiscountType(editingRate.discount_type || "percentage");
      setDiscountValue(editingRate.discount_value?.toString() || "");
    }
  }, [editingRate]);

  const selectedRate = rates.find((r) => r.id === selectedRateId);
  const numericValue = parseInt(discountValue) || 0;

  // Calculate preview price
  const previewPrice = selectedRate
    ? discountType === "percentage"
      ? selectedRate.base_price - Math.round(selectedRate.base_price * numericValue / 100)
      : Math.max(0, selectedRate.base_price - numericValue)
    : 0;

  const isValid =
    selectedRateId &&
    numericValue > 0 &&
    (discountType === "percentage" ? numericValue <= 100 : numericValue <= (selectedRate?.base_price || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-lg shadow-[0_0_60px_rgba(168,85,247,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple/20 to-amber-500/20 border border-neon-purple/30 flex items-center justify-center">
              <SvgTag />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Atur Dynamic Promo</h3>
              <p className="text-[11px] text-slate-500">Konfigurasi diskon untuk paket tertentu</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <SvgX />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Target Rate Select */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block ml-0.5">
              Target Kategori / Paket
            </label>
            <select
              value={selectedRateId}
              onChange={(e) => setSelectedRateId(e.target.value)}
              disabled={!!editingRate}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-purple/50 outline-none appearance-none [&>option]:bg-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— Pilih paket —</option>
              {rates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.label} — Rp {rate.base_price.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>

          {/* Discount Type */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block ml-0.5">
              Tipe Diskon
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType("percentage")}
                className={`flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold border transition-all duration-300 ${
                  discountType === "percentage"
                    ? "bg-neon-purple/15 text-neon-purple border-neon-purple/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-white"
                }`}
              >
                <SvgPercent />
                Persentase (%)
              </button>
              <button
                onClick={() => setDiscountType("fixed")}
                className={`flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold border transition-all duration-300 ${
                  discountType === "fixed"
                    ? "bg-neon-purple/15 text-neon-purple border-neon-purple/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-white"
                }`}
              >
                <SvgDollar />
                Potongan Tetap (Rp)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block ml-0.5">
              Nominal Diskon
            </label>
            <div className="relative">
              {discountType === "fixed" && (
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-sm font-bold text-slate-500">Rp</span>
                </div>
              )}
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "20" : "5000"}
                className={`w-full bg-slate-950 border border-slate-700 rounded-xl py-3 text-sm text-white font-mono focus:border-neon-purple/50 outline-none transition-all ${
                  discountType === "fixed" ? "pl-12 pr-4" : "pl-4 pr-12"
                }`}
                min="0"
                max={discountType === "percentage" ? 100 : undefined}
              />
              {discountType === "percentage" && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <span className="text-sm font-bold text-slate-500">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {selectedRate && numericValue > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preview Harga</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-500 line-through mr-2">
                    Rp {selectedRate.base_price.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {discountType === "percentage"
                      ? `-${numericValue}%`
                      : `-Rp ${numericValue.toLocaleString("id-ID")}`}
                  </span>
                </div>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  Rp {previewPrice.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onSave({
                rateId: selectedRateId,
                discountType,
                discountValue: numericValue,
              })
            }
            disabled={saving || !isValid}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-[0.98]"
          >
            {saving ? (
              <>
                <SvgLoader />
                Menyimpan...
              </>
            ) : (
              <>
                <SvgCheck />
                Simpan & Aktifkan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ADD RATE MODAL ──────────────────────────────────────────
function AddRateModal({
  branchId,
  onClose,
  onSaved,
}: {
  branchId: string;
  onClose: () => void;
  onSaved: (rate: RoomRate) => void;
}) {
  const [label, setLabel] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [basePrice, setBasePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { categoryNames } = useFacilityCategories();
  const [category, setCategory] = useState("");

  // Initialise category to first option once categoryNames loads
  useEffect(() => {
    if (categoryNames.length > 0 && !category) {
      setCategory(categoryNames[0]);
    }
  }, [categoryNames, category]);

  // Auto-fill base price from facilities.price_per_hour × duration when category/duration change
  useEffect(() => {
    if (!category || !branchId) return;
    const hrs = parseInt(durationHours) || 1;
    supabase
      .from("facilities")
      .select("price_per_hour")
      .eq("branch_id", branchId)
      .eq("category", category)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.price_per_hour) {
          setBasePrice(String(data.price_per_hour * hrs));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, durationHours, branchId]);

  const handleSave = async () => {
    if (!label || !basePrice) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("room_rates")
        .insert({
          branch_id: branchId,
          facility_category: category,
          label: label.trim(),
          duration_hours: parseInt(durationHours),
          base_price: parseInt(basePrice),
        })
        .select()
        .single();

      if (error) throw error;
      onSaved(data as RoomRate);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-md shadow-[0_0_60px_rgba(59,130,246,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Tambah Paket Harga</h3>
            <p className="text-[11px] text-slate-500">Buat rate baru untuk Dynamic Promo Engine</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <SvgX />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Label Paket *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="PS4 Lantai 1 - Paket 3 Jam"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-purple/50 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-purple/50 outline-none appearance-none [&>option]:bg-slate-900"
              >
                {categoryNames.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Durasi (Jam)</label>
              <input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                min="1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-neon-purple/50 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Harga Dasar *</label>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden focus-within:border-neon-purple/50">
              <span className="px-4 py-3 bg-slate-900 border-r border-slate-700 text-sm font-bold text-slate-500">Rp</span>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="35000"
                className="w-full bg-transparent border-none px-4 py-3 text-sm text-white outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-slate-800">Batal</button>
          <button
            onClick={handleSave}
            disabled={saving || !label || !basePrice}
            className="flex-1 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple border border-neon-purple/30 text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:bg-neon-purple/30"
          >
            {saving ? <><SvgLoader /> Menyimpan...</> : <><SvgCheck /> Simpan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN POWER TOOLS TAB ────────────────────────────────────
export default function PowerToolsTab({ branchId }: { branchId: string }) {
  const supabase = createClient();
  const [rates, setRates] = useState<RoomRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPromo, setSavingPromo] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingRate, setEditingRate] = useState<RoomRate | null>(null);
  const [showAddRate, setShowAddRate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch rates
  const fetchRates = useCallback(async () => {
    if (!branchId) return;
    try {
      const { data, error } = await supabase
        .from("room_rates")
        .select("*")
        .eq("branch_id", branchId)
        .order("facility_category")
        .order("duration_hours");
      if (error) throw error;
      setRates((data as RoomRate[]) || []);
    } catch (err) {
      console.error("Failed to fetch room_rates", err);
    } finally {
      setLoading(false);
    }
  }, [branchId, supabase]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // ── Toggle handler (Smart UX) ─────────────────────────────
  const handleToggle = useCallback(
    (rate: RoomRate, newValue: boolean) => {
      if (newValue) {
        // Turning ON: check if discount is configured
        if (!rate.discount_value || rate.discount_value === 0 || !rate.discount_type) {
          // Force modal open to configure first
          setEditingRate(rate);
          setShowPromoModal(true);
          return;
        }
        // Already configured, just toggle on
        handleQuickToggle(rate.id, true);
      } else {
        // Turning OFF: just deactivate
        handleQuickToggle(rate.id, false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Quick toggle (no modal)
  const handleQuickToggle = async (rateId: string, active: boolean) => {
    // Optimistic update
    setRates((prev) =>
      prev.map((r) => (r.id === rateId ? { ...r, is_discount_active: active } : r))
    );

    const { error } = await supabase
      .from("room_rates")
      .update({ is_discount_active: active })
      .eq("id", rateId);

    if (error) {
      // Revert on failure
      setRates((prev) =>
        prev.map((r) => (r.id === rateId ? { ...r, is_discount_active: !active } : r))
      );
      alert("Gagal mengubah status promo");
    }
  };

  // ── Save promo from modal ─────────────────────────────────
  const handleSavePromo = async (formData: PromoFormData) => {
    setSavingPromo(true);
    try {
      const { error } = await supabase
        .from("room_rates")
        .update({
          discount_type: formData.discountType,
          discount_value: formData.discountValue,
          is_discount_active: true,
        })
        .eq("id", formData.rateId);

      if (error) throw error;

      // Update local state
      setRates((prev) =>
        prev.map((r) =>
          r.id === formData.rateId
            ? {
                ...r,
                discount_type: formData.discountType,
                discount_value: formData.discountValue,
                is_discount_active: true,
              }
            : r
        )
      );

      setShowPromoModal(false);
      setEditingRate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan promo");
    } finally {
      setSavingPromo(false);
    }
  };

  // ── Delete rate ────────────────────────────────────────────
  const handleDeleteRate = async (rate: RoomRate) => {
    if (!confirm(`Hapus paket "${rate.label}"?`)) return;
    setDeletingId(rate.id);
    try {
      const { error } = await supabase.from("room_rates").delete().eq("id", rate.id);
      if (error) throw error;
      setRates((prev) => prev.filter((r) => r.id !== rate.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Active promo count ────────────────────────────────────
  const activePromoCount = rates.filter((r) => r.is_discount_active).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Memuat konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ SECTION HEADER: DYNAMIC PROMO ENGINE ═══ */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
        {/* Section Title Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-neon-purple/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <SvgZap />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Dynamic Promo Engine
                {activePromoCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {activePromoCount} Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Atur diskon otomatis per paket sewa. Diskon langsung terpasang di halaman booking.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddRate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <SvgPlus />
            Tambah Paket
          </button>
        </div>

        {/* Rate List */}
        {rates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-600">
              <SvgTag />
            </div>
            <p className="text-sm text-slate-500 mb-1">Belum ada paket harga</p>
            <p className="text-xs text-slate-600">Tambahkan paket harga untuk menggunakan Dynamic Promo Engine.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {rates.map((rate) => {
              const finalPrice =
                rate.is_discount_active && rate.discount_value > 0
                  ? rate.discount_type === "percentage"
                    ? rate.base_price - Math.round(rate.base_price * rate.discount_value / 100)
                    : Math.max(0, rate.base_price - rate.discount_value)
                  : rate.base_price;

              return (
                <div
                  key={rate.id}
                  className={`px-6 py-4 flex items-center justify-between gap-4 group transition-colors ${
                    rate.is_discount_active ? "bg-neon-purple/[0.03]" : "hover:bg-white/[0.015]"
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{rate.label}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
                        {rate.facility_category}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">{rate.duration_hours}h</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {rate.is_discount_active && rate.discount_value > 0 ? (
                        <>
                          <span className="text-xs text-slate-500 line-through font-mono">
                            Rp {rate.base_price.toLocaleString("id-ID")}
                          </span>
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {rate.discount_type === "percentage"
                              ? `-${rate.discount_value}%`
                              : `-Rp ${rate.discount_value.toLocaleString("id-ID")}`}
                          </span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            Rp {finalPrice.toLocaleString("id-ID")}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-white font-mono">
                          Rp {rate.base_price.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Edit Promo */}
                    <button
                      onClick={() => {
                        setEditingRate(rate);
                        setShowPromoModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-neon-purple hover:bg-neon-purple/10 transition-all"
                      title="Atur diskon"
                    >
                      <SvgGear />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRate(rate)}
                      disabled={deletingId === rate.id}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30"
                      title="Hapus paket"
                    >
                      <SvgTrash />
                    </button>

                    {/* Toggle */}
                    <PromoToggle
                      enabled={rate.is_discount_active}
                      onChange={(v) => handleToggle(rate, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ PROMO CONFIG MODAL ═══ */}
      {showPromoModal && (
        <PromoConfigModal
          rates={rates}
          editingRate={editingRate}
          onClose={() => {
            setShowPromoModal(false);
            setEditingRate(null);
          }}
          onSave={handleSavePromo}
          saving={savingPromo}
        />
      )}

      {/* ═══ ADD RATE MODAL ═══ */}
      {showAddRate && (
        <AddRateModal
          branchId={branchId}
          onClose={() => setShowAddRate(false)}
          onSaved={(rate) => {
            setRates((prev) => [...prev, rate]);
          }}
        />
      )}
      {/* ═══ CATEGORY MANAGER ═══ */}
      <CategoryManager />
    </div>
  );
}

// ── CATEGORY MANAGER ────────────────────────────────────────
function CategoryManager() {
  const supabase = createClient();
  const { categories, refetch } = useFacilityCategories();
  const [allCategories, setAllCategories] = useState<FacilityCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch ALL categories (including inactive)
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("facility_categories")
        .select("*")
        .order("sort_order");
      setAllCategories((data as FacilityCategory[]) || []);
    };
    fetch();
  }, [supabase, categories]); // re-run when categories change

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      const maxOrder = allCategories.reduce((max, c) => Math.max(max, c.sort_order), 0);
      const { error } = await supabase.from("facility_categories").insert({
        name: newCatName.trim(),
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      setNewCatName("");
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah kategori");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: FacilityCategory) => {
    setAllCategories(prev =>
      prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c)
    );
    const { error } = await supabase
      .from("facility_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) {
      setAllCategories(prev =>
        prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c)
      );
      alert("Gagal mengubah status");
    }
    await refetch();
  };

  const handleDelete = async (cat: FacilityCategory) => {
    if (!confirm(`Hapus kategori "${cat.name}"?\n\nFasilitas dengan kategori ini akan terganggu.`)) return;
    setDeletingId(cat.id);
    try {
      const { error } = await supabase.from("facility_categories").delete().eq("id", cat.id);
      if (error) {
        if (error.message.includes("violates foreign key")) {
          alert("Tidak bisa dihapus karena masih digunakan oleh fasilitas. Nonaktifkan saja.");
        } else {
          throw error;
        }
        return;
      }
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue/20 to-emerald-500/20 border border-neon-blue/30 flex items-center justify-center text-neon-blue">
            <SvgTag />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Kelola Kategori Fasilitas</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tambah atau nonaktifkan kategori. Perubahan langsung berlaku di seluruh sistem.
            </p>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {allCategories.filter(c => c.is_active).length} aktif
        </span>
      </div>

      {/* Category List */}
      <div className="divide-y divide-slate-800/50">
        {allCategories.map((cat) => (
          <div key={cat.id} className={`px-6 py-3.5 flex items-center justify-between group transition-colors ${cat.is_active ? "hover:bg-white/[0.015]" : "opacity-50"}`}>
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${cat.is_active ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span className={`text-sm font-semibold ${cat.is_active ? "text-white" : "text-slate-500 line-through"}`}>
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-600 font-mono">#{cat.sort_order}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(cat)}
                disabled={deletingId === cat.id}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-30"
                title="Hapus"
              >
                <SvgTrash />
              </button>
              <PromoToggle
                enabled={cat.is_active}
                onChange={() => handleToggle(cat)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add New */}
      <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nama kategori baru, misal: PS5 Regular"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-neon-purple/50 outline-none placeholder:text-slate-600"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newCatName.trim()}
          className="px-5 py-2.5 rounded-xl bg-neon-blue/20 text-neon-blue border border-neon-blue/30 text-xs font-bold uppercase tracking-wider hover:bg-neon-blue/30 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {saving ? <SvgLoader /> : <SvgPlus />}
          Tambah
        </button>
      </div>
    </div>
  );
}
