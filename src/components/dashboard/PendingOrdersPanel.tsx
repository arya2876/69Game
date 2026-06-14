"use client";

import { useState } from "react";
import { Check, X, Loader2, Bell, ChevronDown, ChevronUp, MessageSquare, ShoppingCart } from "lucide-react";
import { useRealtimeOrderRequests, type OrderRequestDetail } from "@/lib/hooks/useRealtimeOrderRequests";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  return `${Math.floor(diffMin / 60)} jam lalu`;
}

function RoomHeader({ order }: { order: OrderRequestDetail }) {
  const boothNumber = order.facilities?.booth_number;
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {boothNumber && (
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest border bg-slate-800 text-slate-200 border-slate-600">
          {boothNumber}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{order.facilities?.name ?? "Unknown"}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          {order.facilities?.category} · {timeAgo(order.created_at)}
        </p>
      </div>
    </div>
  );
}

function MessageCard({
  order, onAccept, onReject, loading,
}: { order: OrderRequestDetail; onAccept: () => void; onReject: () => void; loading: boolean }) {
  return (
    <div className="bg-slate-900/80 border border-neon-blue/25 rounded-2xl overflow-hidden animate-[slideIn_0.2s_ease-out]">
      <div className="flex items-start justify-between px-4 py-3 bg-neon-blue/5 border-b border-neon-blue/15">
        <RoomHeader order={order} />
        <span className="shrink-0 ml-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-neon-blue/20 text-neon-blue border border-neon-blue/30">
          <MessageSquare className="w-3 h-3" />
          Pesan
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-white bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700/60 italic">
          &quot;{order.message}&quot;
        </p>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onReject}
          disabled={loading}
          className="flex-1 h-9 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Tutup
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-[2] h-9 rounded-xl bg-neon-blue/20 border border-neon-blue/30 text-neon-blue text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-neon-blue/30 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Tandai Selesai
        </button>
      </div>
    </div>
  );
}

function FoodOrderCard({
  order, onAccept, onReject, loading,
}: { order: OrderRequestDetail; onAccept: () => void; onReject: () => void; loading: boolean }) {
  const total = order.order_request_items.reduce(
    (s, item) => s + (item.menu_items?.price ?? 0) * item.quantity, 0
  );

  return (
    <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl overflow-hidden animate-[slideIn_0.2s_ease-out]">
      <div className="flex items-start justify-between px-4 py-3 bg-amber-500/5 border-b border-amber-500/15">
        <RoomHeader order={order} />
        <span className="shrink-0 ml-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Pesanan
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {order.order_request_items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {item.quantity}×
                </span>
                <p className="text-sm text-white truncate">{item.menu_items?.name ?? "Item tidak diketahui"}</p>
              </div>
              {item.notes && (
                <p className="text-[11px] text-slate-500 mt-0.5 ml-7 italic">&quot;{item.notes}&quot;</p>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono flex-shrink-0">
              {item.menu_items ? formatRupiah(item.menu_items.price * item.quantity) : "-"}
            </p>
          </div>
        ))}

        {order.message && (
          <div className="flex items-start gap-2 pt-2 border-t border-slate-800 mt-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 italic">{order.message}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
          <span className="text-xs text-slate-500">
            {order.order_request_items.reduce((s, i) => s + i.quantity, 0)} item
          </span>
          <span className="text-sm font-bold text-white">{formatRupiah(total)}</span>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onReject}
          disabled={loading}
          className="flex-1 h-9 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-red-500/10 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Tolak
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex-[2] h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-emerald-500/30 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Terima & Tagihkan
        </button>
      </div>
    </div>
  );
}

interface Props {
  branchId: string | null;
}

export default function PendingOrdersPanel({ branchId }: Props) {
  const { orders, loading, accept, reject, actionLoading } = useRealtimeOrderRequests(branchId);
  const [messagesCollapsed, setMessagesCollapsed] = useState(false);
  const [foodCollapsed, setFoodCollapsed] = useState(false);

  if (loading || orders.length === 0) return null;

  const messages = orders.filter((o) => o.order_request_items.length === 0 && !!o.message);
  const foodOrders = orders.filter((o) => o.order_request_items.length > 0);

  return (
    <div className="space-y-3">
      {/* ── Food Orders Section ── */}
      {foodOrders.length > 0 && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/25 rounded-2xl overflow-hidden">
          <button
            onClick={() => setFoodCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-black text-black flex items-center justify-center">
                  {foodOrders.length}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Pesanan Makanan</p>
                <p className="text-xs text-amber-400">{foodOrders.length} pesanan menunggu konfirmasi</p>
              </div>
            </div>
            {foodCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </button>

          {!foodCollapsed && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
              <div className="pt-4 space-y-3">
                {foodOrders.map((order) => (
                  <FoodOrderCard
                    key={order.id}
                    order={order}
                    onAccept={() => accept(order.id)}
                    onReject={() => reject(order.id)}
                    loading={actionLoading === order.id}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-600 text-center pt-1">
                Klik <span className="text-emerald-500">Terima</span> untuk menambahkan ke tagihan sesi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Messages Section ── */}
      {messages.length > 0 && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-neon-blue/25 rounded-2xl overflow-hidden">
          <button
            onClick={() => setMessagesCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-neon-blue/15 border border-neon-blue/25 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-neon-blue" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neon-blue text-[10px] font-black text-white flex items-center justify-center">
                  {messages.length}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Pesan Customer</p>
                <p className="text-xs text-neon-blue">{messages.length} pesan menunggu balasan</p>
              </div>
            </div>
            {messagesCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </button>

          {!messagesCollapsed && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
              <div className="pt-4 space-y-3">
                {messages.map((order) => (
                  <MessageCard
                    key={order.id}
                    order={order}
                    onAccept={() => accept(order.id)}
                    onReject={() => reject(order.id)}
                    loading={actionLoading === order.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
