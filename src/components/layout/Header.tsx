"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogIn,
  Menu,
  ShoppingBag,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useSound } from "@/contexts/SoundContext";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "Our Farm" },
  { href: "/products", label: "Products" },
  { href: "/gallery", label: "Gallery" },
  { href: "/videos", label: "Videos" },
  { href: "/track-order", label: "Track Order" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isStaff, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const { enabled, toggleSound } = useSound();
  const settings = useBusinessSettings();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const dashboardHref = isAdmin ? "/admin" : isStaff ? "/staff" : "/dashboard";
  const notificationHref = isAdmin ? "/admin/notifications" : isStaff ? "/staff/notifications" : "/dashboard/notifications";
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span><i className="live-dot" /> Fresh milk available in Ngculwini</span>
          <span className="announcement-delivery">Free delivery around Manzini &amp; Matsapha</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container nav-shell">
          <BrandMark compact />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {publicLinks.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                className={cn("nav-link", pathname === link.href && "nav-link-active")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              type="button"
              onClick={toggleSound}
              className="icon-button desktop-sound"
              aria-label={enabled ? "Turn off farm ambience" : "Turn on farm ambience"}
              title={enabled ? "Farm ambience on" : "Play farm ambience"}
            >
              {enabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <Link href="/cart" className="icon-button cart-button" aria-label={`Cart with ${itemCount} items`}>
              <ShoppingBag size={21} />
              {itemCount > 0 && <span className="cart-count">{itemCount > 99 ? "99+" : itemCount}</span>}
            </Link>
            {!loading && !user ? (
              <Link href="/login" className="button button-small button-dark desktop-auth">
                <LogIn size={17} /> Sign in
              </Link>
            ) : user ? (
              <div className="account-menu-wrap desktop-auth">
                <button className="account-trigger" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}>
                  <span className="account-avatar">{user.fullName?.[0]?.toUpperCase() || "U"}</span>
                  <span>{user.fullName.split(" ")[0]}</span>
                </button>
                {accountOpen && (
                  <div className="account-menu">
                    <span className="account-role">{user.role} account</span>
                    <Link href={dashboardHref}><LayoutDashboard size={17} /> Dashboard</Link>
                    <Link href={notificationHref}><Bell size={17} /> Notifications</Link>
                    <Link href="/dashboard/profile"><UserRound size={17} /> Profile</Link>
                    <button onClick={handleLogout}>Sign out</button>
                  </div>
                )}
              </div>
            ) : null}
            <button className="icon-button mobile-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"}>
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <div id="mobile-navigation" className={cn("mobile-panel", open && "mobile-panel-open")}>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {publicLinks.map((link) => (
              <Link href={link.href} key={link.href} className={cn(pathname === link.href && "active")}>
                {link.label}
              </Link>
            ))}
            <button className="mobile-sound" onClick={toggleSound}>
              {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {enabled ? "Farm ambience on" : "Play farm ambience"}
            </button>
            <div className="mobile-nav-divider" />
            {user ? (
              <>
                <Link href={dashboardHref}><LayoutDashboard size={18} /> Dashboard</Link>
                <button onClick={handleLogout}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login"><LogIn size={18} /> Sign in</Link>
                <Link href="/register" className="mobile-register">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
