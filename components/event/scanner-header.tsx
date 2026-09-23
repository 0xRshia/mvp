import { ShieldCheck } from "lucide-react";

export function ScannerHeader() {
  return (
    <header className="scanner-header">
      <div className="brand"><img src="/favicon.svg" alt="" />هم‌قدم</div>
      <span><ShieldCheck size={17} /> پذیرش ایونت</span>
    </header>
  );
}
