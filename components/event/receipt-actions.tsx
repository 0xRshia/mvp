"use client";

import { useState } from "react";
import { Printer, ReceiptText } from "lucide-react";
import { api } from "@/lib/client";
import type { ReceiptResponse } from "@/lib/account-types";
import { createReceiptPdf } from "@/lib/receipt-pdf";
import { ButtonLabel } from "@/components/ui/button-label";

export function ReceiptActions({ reservationId }: { reservationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { receipt, serverNow } = await api<ReceiptResponse>(`/api/reservations/${encodeURIComponent(reservationId)}/receipt`);
      if (serverNow === undefined) throw new Error("ساعت سرور برای ساخت رسید دریافت نشد. دوباره تلاش کنید.");
      const blob = await createReceiptPdf(receipt, serverNow);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${receipt.id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="receipt-actions">
      <button type="button" className="button outline" onClick={() => window.open(`/account/receipt?id=${encodeURIComponent(reservationId)}`, "_blank", "noopener,noreferrer")}>
        <Printer size={17} aria-hidden="true" /> نمایش و چاپ رسید
      </button>
      <button type="button" className="button outline" disabled={busy} aria-busy={busy} onClick={download}>
        <ReceiptText size={17} aria-hidden="true" />
        <ButtonLabel busy={busy} pending="در حال ساخت PDF…">دریافت PDF رسید</ButtonLabel>
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
