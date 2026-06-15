"use client";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  facilityName: string;
  boothNumber?: string | null;
  qrUrl: string;
}

export default function PrintableQRCodeStandee({ facilityName, boothNumber, qrUrl }: Props) {
  return (
    <>
      {/*
        Inject global @media print rules:
        - Suppress everything in the body (visibility: hidden)
        - Reveal only .qr-print-standee and its children
        - Set page size to A6 portrait for compact table standee output
      */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { size: A6 portrait; margin: 0; }
            body * { visibility: hidden !important; }
            .qr-print-standee,
            .qr-print-standee * { visibility: visible !important; }
          }
        `,
      }} />

      {/*
        Screen: hidden (display:none via Tailwind 'hidden')
        Print:  fixed full-page overlay (display:flex via Tailwind 'print:flex')
        z-[9999] ensures it sits above any DOM remnants that escape visibility:hidden
      */}
      <div
        className="qr-print-standee hidden print:flex fixed inset-0 z-[9999] bg-white flex-col"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {/* ── TOP BRAND HEADER ──────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #1d4ed8 100%)",
            padding: "22px 28px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#a78bfa" />
            </svg>
            <span style={{ color: "#ffffff", fontSize: "26px", fontWeight: "900", letterSpacing: "6px", lineHeight: 1 }}>
              69GAME
            </span>
          </div>
          <p style={{ color: "#c4b5fd", fontSize: "10px", letterSpacing: "3px", margin: 0, textTransform: "uppercase" }}>
            Gaming Lounge · Semarang
          </p>
        </div>

        {/* ── GRADIENT DIVIDER ──────────────────────────────── */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #7c3aed, #2563eb, #7c3aed)", flexShrink: 0 }} />

        {/* ── MAIN CONTENT ──────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 28px",
          background: "#ffffff",
        }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: "9px",
            color: "#9ca3af",
            letterSpacing: "3px",
            textTransform: "uppercase",
            margin: "0 0 10px 0",
            fontWeight: "700",
          }}>
            Scan untuk memesan
          </p>

          {/* Facility name */}
          <h2 style={{
            fontSize: "26px",
            fontWeight: "900",
            color: "#111827",
            margin: "0",
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            textTransform: "uppercase",
          }}>
            {facilityName}
          </h2>

          {/* Booth badge */}
          {boothNumber && (
            <div style={{
              marginTop: "8px",
              background: "#f3f4f6",
              border: "1.5px solid #e5e7eb",
              borderRadius: "20px",
              padding: "3px 14px",
            }}>
              <span style={{
                fontSize: "10px",
                color: "#6b7280",
                fontWeight: "700",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}>
                BILIK {boothNumber}
              </span>
            </div>
          )}

          {/* QR Code */}
          <div style={{
            marginTop: "22px",
            background: "#ffffff",
            border: "2.5px solid #111827",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
          }}>
            <QRCodeSVG
              value={qrUrl}
              size={190}
              level="H"
              includeMargin={false}
              style={{ display: "block" }}
            />
          </div>

          {/* URL hint */}
          <p style={{
            marginTop: "10px",
            fontSize: "8px",
            color: "#d1d5db",
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}>
            69game.id/meja
          </p>

          {/* Divider dot row */}
          <div style={{ display: "flex", gap: "6px", margin: "16px 0" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: i === 2 ? "20px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === 2 ? "#7c3aed" : "#e5e7eb",
              }} />
            ))}
          </div>

          {/* Instruction text */}
          <p style={{
            fontSize: "12px",
            color: "#374151",
            textAlign: "center",
            lineHeight: 1.7,
            maxWidth: "210px",
            margin: 0,
            fontWeight: "500",
          }}>
            Scan QR ini untuk memesan{" "}
            <strong style={{ color: "#111827" }}>Makanan &amp; Minuman</strong>{" "}
            langsung dari tempat duduk Anda.
          </p>
        </div>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <div style={{
          background: "#111827",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          flexShrink: 0,
        }}>
          {(["SCAN", "ORDER", "ENJOY"] as const).map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ color: "#d1d5db", fontSize: "10px", letterSpacing: "3px", fontWeight: "700" }}>
                {label}
              </span>
              {i < 2 && (
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#4c1d95" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
