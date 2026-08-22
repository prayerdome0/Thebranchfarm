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
  MessageCircle,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { BUSINESS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  return <SiteHeaderContent key={pathname} pathname={pathname} />;
}

function SiteHeaderContent({ pathname }: { pathname: string }) {
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
    function onClick(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Spec: Home, Shop, Our Farm, Gallery, About, Contact, Cart, Sign In
  const nav = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/our-farm", label: "Our Farm" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const canEnter = Boolean(user && (user.role === "staff" || user.role === "admin"));

  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span>
            <i className="live-dot" /> {BUSINESS.name} · {BUSINESS.slogan}
          </span>
          <span className="announcement-delivery">
            <Truck size={14} /> {BUSINESS.deliveryFree}
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
            <Link
              className="icon-button"
              style={{ position: "relative" }}
              href="/cart"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag size={21} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>

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
              </button>

              {accountOpen && (
                <div className="account-menu">
                  {canEnter ? (
                    <>
                      <span className="account-role">
                        {user?.role === "admin" ? "Administrator" : "Staff"}
                      </span>
                      <Link href="/dashboard" onClick={() => setAccountOpen(false)}>
                        <LayoutDashboard size={16} /> Dashboard
                      </Link>
                      <Link href="/orders" onClick={() => setAccountOpen(false)}>
                        <PackageSearch size={16} /> Orders
                      </Link>
                      <button onClick={() => { setAccountOpen(false); logout(); }}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </>
                  ) : user ? (
                    <>
                      <span className="account-role">Registered customer</span>
                      <Link href="/account" onClick={() => setAccountOpen(false)}><UserRound size={16} /> My account</Link>
                      <Link href="/track" onClick={() => setAccountOpen(false)}><PackageSearch size={16} /> Track an order</Link>
                      <button onClick={() => { setAccountOpen(false); logout(); }}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="account-role">{BUSINESS.name}</span>
                      <Link href="/login" onClick={() => setAccountOpen(false)}>
                        <LogIn size={16} /> Sign In
                      </Link>
                      <Link href="/register" onClick={() => setAccountOpen(false)}>
                        <UserRound size={16} /> Register
                      </Link>
                      <Link href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer" onClick={() => setAccountOpen(false)}>
                        <MessageCircle size={16} /> WhatsApp Us
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
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
            <Link href="/cart" onClick={() => setMenuOpen(false)}>Cart {count > 0 ? `(${count})` : ""}</Link>
            <Link href="/our-farm" onClick={() => setMenuOpen(false)}>Our Farm</Link>
            <div className="mobile-nav-divider" />
            {canEnter ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { setMenuOpen(false); logout(); }}>Sign out</button>
              </>
            ) : user ? (
              <>
                <Link href="/account" onClick={() => setMenuOpen(false)}>My account</Link>
                <Link href="/track" onClick={() => setMenuOpen(false)}>Track an order</Link>
                <button onClick={() => { setMenuOpen(false); logout(); }}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/register" className="mobile-register" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
                <a href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer" className="button button-whatsapp" style={{ marginTop: 12 }}>
                  <MessageCircle size={16} /> WhatsApp Us
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
