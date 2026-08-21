"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { BUSINESS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setMenuOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const nav = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/videos", label: "Videos" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/track", label: "Track order" },
  ];

  const canEnter = Boolean(user && (user.role === "staff" || user.role === "admin"));

  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span>
            <i className="live-dot" /> {BUSINESS.name} · {BUSINESS.slogan}
          </span>
          <span>
            <Truck size={14} /> Order online, collect or arrange delivery
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container nav-shell">
          <BrandMark />

          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link",
                  (item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)) && "nav-link-active",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form className="header-search" onSubmit={submitSearch} role="search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
            />
          </form>

          <div className="nav-actions">
            <button
              className="icon-button"
              style={{ position: "relative" }}
              onClick={() => router.push("/cart")}
              aria-label={`Open cart, ${count} items`}
            >
              <ShoppingBag size={21} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>

            <div className="account-menu-wrap" ref={accountRef}>
              <button
                className="account-trigger"
                onClick={() => setAccountOpen((value) => !value)}
                aria-expanded={accountOpen}
                aria-label="Account menu"
              >
                <span className="account-avatar">
                  {user ? initials(user.fullName) : <UserRound size={16} />}
                </span>
                <span style={{ display: "none" }} className="sr-only">
                  Menu
                </span>
              </button>

              {accountOpen && (
                <div className="account-menu">
                  {canEnter ? (
                    <>
                      <span className="account-role">
                        {user?.role === "admin" ? "Administrator" : "Staff"}
                      </span>
                      <Link href="/dashboard">
                        <LayoutDashboard size={16} /> Dashboard
                      </Link>
                      <Link href="/orders">
                        <PackageSearch size={16} /> Orders
                      </Link>
                      <button onClick={() => logout()}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="account-role">Farm workspace</span>
                      <Link href="/login">
                        <LogIn size={16} /> Sign in
                      </Link>
                      <Link href="/register">
                        <UserRound size={16} /> Request access
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              className="icon-button mobile-menu-trigger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        <div className={cn("mobile-panel", menuOpen && "mobile-panel-open")}>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) && "active",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/cart">Cart {count > 0 ? `(${count})` : ""}</Link>
            <div className="mobile-nav-divider" />
            {canEnter ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <button onClick={() => logout()}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link href="/register" className="mobile-register">
                  Request access
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
