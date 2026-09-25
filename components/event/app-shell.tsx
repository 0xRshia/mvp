"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Ticket,
  UserRound,
  LogOut,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { User } from "@/lib/types";
import { ThemeMenu } from "@/components/event/theme-menu";
import { AppLink, useAppNavigate } from "./app-navigation";
import { useSelectionIndicator } from "@/hooks/use-selection-indicator";
type Auth = {
  user: User | null;
  loading: boolean;
  smsReady: boolean;
  // TODO(PRODUCTION): REMOVE_TEMP_LOGIN — remove this flag and its initial values.
  temporaryLoginEnabled: boolean;
  paymentReady: boolean;
  skipPayDevEnabled: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loggingOut: boolean;
};
const AuthContext = createContext<Auth>({
  user: null,
  loading: true,
  smsReady: false,
  temporaryLoginEnabled: false,
  paymentReady: false,
  skipPayDevEnabled: false,
  refresh: async () => {},
  logout: async () => {},
  loggingOut: false,
});
export const useAuth = () => useContext(AuthContext);
export function AppShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    user: null as User | null,
    loading: true,
    smsReady: false,
    temporaryLoginEnabled: false,
    paymentReady: false,
    skipPayDevEnabled: false,
  });
  const path = usePathname().replace(/\/$/, "") || "/";
  const eventDetail = /^\/events\/[^/]+$/.test(path) && path !== "/events/free";
  const discovering = path === "/" || path === "/events" || path === "/events/free";
  const navigate = useAppNavigate();
  const desktopNav = useSelectionIndicator<HTMLElement>("a.active");
  const mobileNav = useSelectionIndicator<HTMLElement>("a.active");
  const [loggingOut, setLoggingOut] = useState(false);
  const scannerOnly = path === "/scanner";
  async function refresh() {
    await api<Omit<Auth, "refresh" | "loading" | "logout" | "loggingOut">>("/api/me").then(
      (data) => setState({ ...data, loading: false }),
      () => setState((state) => ({ ...state, loading: false })),
    );
  }
  useEffect(() => {
    if (!scannerOnly) void refresh();
  }, [scannerOnly]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", {});
      setState((s) => ({ ...s, user: null }));
      navigate("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoggingOut(false);
    }
  }
  if (scannerOnly) return <div data-route-content className="route-content">{children}</div>;
  return (
    <AuthContext.Provider value={{ ...state, refresh, logout, loggingOut }}>
      <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
      <header className="site-header">
        <div className="header-inner">
          <AppLink className="brand" href="/">
            <img src="/favicon.svg" alt="" />
            هم‌قدم<span>همراه تو، قدم به قدم</span>
          </AppLink>
          <nav ref={desktopNav} className="selection-track" aria-label="منوی اصلی">
            <span className="selection-indicator" aria-hidden="true" />
            <AppLink className={discovering ? "active" : ""} href="/">
              کشف ایونت‌ها
            </AppLink>
            <AppLink
              className={path === "/reservations" ? "active" : ""}
              href="/reservations"
            >
              بلیت‌های من
            </AppLink>
            <AppLink
              className={path === "/account" ? "active" : ""}
              href="/account"
            >
              حساب کاربری
            </AppLink>
          </nav>
          <div className="account-actions">
            <ThemeMenu />
            {state.user ? (
              <>
                <AppLink className="button outline login-link" href="/account">
                  <UserRound size={16} />
                  {state.user.name || "حساب کاربری"}
                </AppLink>
                <button
                  className="icon-button logout"
                  type="button"
                  disabled={loggingOut}
                  aria-busy={loggingOut}
                  onClick={logout}
                  aria-label="خروج از حساب"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <AppLink className="button outline login-link" href="/login">
                ورود / ثبت‌نام <ArrowLeft size={16} />
              </AppLink>
            )}
          </div>
        </div>
      </header>
      <div id="main-content" tabIndex={-1} data-route-content data-event-detail={eventDetail || undefined} className="route-content">{children}</div>
      <footer className="container footer">
        <AppLink className="brand" href="/">
          هم‌قدم
        </AppLink>
        <span>قرارهای کوچک، خاطره‌های ماندگار.</span>
        <AppLink href="/credits">دربارهٔ تصاویر و ایونت‌های نمونه</AppLink>
      </footer>
      <nav ref={mobileNav} className={`mobile-nav selection-track${eventDetail ? " event-detail-nav" : ""}`} aria-label="منوی اصلی">
        <span className="selection-indicator" aria-hidden="true" />
        <AppLink className={discovering ? "active" : ""} href="/">
          <Compass size={21} />
          کشف ایونت
        </AppLink>
        <AppLink
          className={path === "/reservations" ? "active" : ""}
          href="/reservations"
        >
          <Ticket size={21} />
          بلیت‌های من
        </AppLink>
        <AppLink className={path === "/account" ? "active" : ""} href="/account">
          <UserRound size={21} />
          حساب کاربری
        </AppLink>
      </nav>
      <Toaster position="top-center" dir="rtl" richColors />
    </AuthContext.Provider>
  );
}
