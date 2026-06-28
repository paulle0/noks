// js/qrcode.js — QR generation (svg) + scanning via html5-qrcode
import QRCode from "../lib/qrcode.js";

let html5QrCode = null;

export async function renderQrSvg(text, target) {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1a0f33", light: "#ffffff" },
  });
  target.innerHTML = svg;
}

/**
 * Lazy-load html5-qrcode from local vendor file and start scanning.
 * Returns a stop function.
 */
export async function startScanner(elementId, onResult) {
  if (!window.Html5Qrcode) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "lib/html5-qrcode.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load QR scanner library"));
      document.head.appendChild(s);
    });
  }
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch {}
    html5QrCode = null;
  }
  html5QrCode = new window.Html5Qrcode(elementId);
  await html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 240, height: 240 } },
    (decoded) => onResult(decoded),
    () => {},
  );
  return async function stop() {
    if (!html5QrCode) return;
    try { await html5QrCode.stop(); await html5QrCode.clear(); } catch {}
    html5QrCode = null;
  };
}

export async function stopScannerIfRunning() {
  if (html5QrCode) {
    try { await html5QrCode.stop(); await html5QrCode.clear(); } catch {}
    html5QrCode = null;
  }
}
