import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// POST /api/iot/toggle
// Controls Tuya Smart Plug via Cloud API
// ═══════════════════════════════════════════════════════════════

// ── Tuya Token Management ───────────────────────────────────
let tuyaToken: { access_token: string; expire_at: number } | null = null;

async function getTuyaToken(): Promise<string> {
  const clientId = process.env.TUYA_CLIENT_ID!;
  const clientSecret = process.env.TUYA_CLIENT_SECRET!;
  const endpoint = process.env.TUYA_API_ENDPOINT || "https://openapi.tuyaus.com";

  // Return cached token if still valid
  if (tuyaToken && Date.now() < tuyaToken.expire_at) {
    return tuyaToken.access_token;
  }

  const t = Date.now().toString();
  const stringToSign = clientId + t;
  const sign = crypto
    .createHmac("sha256", clientSecret)
    .update(stringToSign)
    .digest("hex")
    .toUpperCase();

  const response = await fetch(`${endpoint}/v1.0/token?grant_type=1`, {
    method: "GET",
    headers: {
      client_id: clientId,
      sign,
      t,
      sign_method: "HMAC-SHA256",
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Tuya token error: ${data.msg}`);
  }

  tuyaToken = {
    access_token: data.result.access_token,
    expire_at: Date.now() + (data.result.expire_time - 60) * 1000, // Refresh 60s early
  };

  return tuyaToken.access_token;
}

async function signTuyaRequest(
  clientId: string,
  clientSecret: string,
  accessToken: string,
  method: string,
  path: string,
  body: string
): Promise<{ sign: string; t: string }> {
  const t = Date.now().toString();
  const contentHash = crypto.createHash("sha256").update(body || "").digest("hex");
  const stringToSign = [method, contentHash, "", path].join("\n");
  const signStr = clientId + accessToken + t + stringToSign;
  const sign = crypto
    .createHmac("sha256", clientSecret)
    .update(signStr)
    .digest("hex")
    .toUpperCase();

  return { sign, t };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "cashier"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { facility_id, action } = body;

    if (!facility_id || !["on", "off"].includes(action)) {
      return NextResponse.json(
        { error: "facility_id and action ('on'|'off') are required" },
        { status: 400 }
      );
    }

    // Get IoT device for this facility
    const { data: device, error: deviceError } = await supabase
      .from("iot_devices")
      .select("*")
      .eq("facility_id", facility_id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json({ error: "No IoT device found for this facility" }, { status: 404 });
    }

    // ═══════════════════════════════════════════════════════════
    // TUYA CLOUD API — Send device command
    // ═══════════════════════════════════════════════════════════
    const clientId = process.env.TUYA_CLIENT_ID;
    const clientSecret = process.env.TUYA_CLIENT_SECRET;
    const endpoint = process.env.TUYA_API_ENDPOINT || "https://openapi.tuyaus.com";

    let tuyaSuccess = false;

    if (clientId && clientSecret) {
      try {
        const accessToken = await getTuyaToken();
        const path = `/v1.0/iot-2.0/cloud/thing/${device.tuya_device_id}/shadow/properties/issue`;
        const commandBody = JSON.stringify({
          properties: { switch_1: action === "on" },
        });

        const { sign, t } = await signTuyaRequest(
          clientId,
          clientSecret,
          accessToken,
          "POST",
          path,
          commandBody
        );

        const response = await fetch(`${endpoint}${path}`, {
          method: "POST",
          headers: {
            client_id: clientId,
            access_token: accessToken,
            sign,
            t,
            sign_method: "HMAC-SHA256",
            "Content-Type": "application/json",
          },
          body: commandBody,
        });

        const result = await response.json();
        tuyaSuccess = result.success === true;
      } catch (tuyaErr) {
        console.error("Tuya API error:", tuyaErr);
      }
    } else {
      // Dev mode — simulate success
      tuyaSuccess = true;
    }

    // Update device state in database
    await supabase
      .from("iot_devices")
      .update({
        is_on: action === "on",
        last_toggled: new Date().toISOString(),
      })
      .eq("id", device.id);

    return NextResponse.json({
      message: `Device ${action === "on" ? "powered on" : "powered off"}`,
      device_id: device.tuya_device_id,
      is_on: action === "on",
      tuya_api_success: tuyaSuccess,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
