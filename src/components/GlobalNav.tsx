import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { barberPending } from "@/lib/api";
import {
  BBIT_THEME_CHANGE_EVENT,
  BBIT_THEME_KEY,
  getBbitTheme,
  setBbitTheme,
  type BbitTheme,
} from "@/lib/bbitTheme";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_WRAP_BASE =
  "fixed top-0 left-0 right-0 z-50 h-[60px] border-b transition-colors duration-300";

const MOBILE_ORDER: Array<
  | { kind: "section"; id: string; label: string }
  | { kind: "products"; label: string }
> = [
  { kind: "section", id: "gallery", label: "Gallery" },
  { kind: "section", id: "services", label: "Services" },
  { kind: "products", label: "Products" },
  { kind: "section", id: "contact", label: "Contact" },
];

export default function GlobalNav() {
  const { user, logout, isAdmin } = useAuth();
  const staffUser = isAdmin || Boolean(user?.is_staff);
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<BbitTheme>(() => getBbitTheme());
  const [pendingBarberCount, setPendingBarberCount] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const sync = () => setTheme(getBbitTheme());
    window.addEventListener(BBIT_THEME_CHANGE_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === BBIT_THEME_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BBIT_THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") {
      setNavSolid(true);
      return;
    }
    const onScroll = () => setNavSolid(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (!user || !staffUser) {
      setPendingBarberCount(0);
      return;
    }
    barberPending()
      .then((p) => setPendingBarberCount(p.count))
      .catch(() => setPendingBarberCount(0));
  }, [user, staffUser]);

  const handleThemeToggle = () => {
    const next: BbitTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setBbitTheme(next);
  };

  const handleSectionClick = (sectionId: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/") {
      e.preventDefault();
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `/#${sectionId}`);
    }
  };

  const isSectionActive = (sectionId: string) =>
    location.pathname === "/" && location.hash === `#${sectionId}`;

  const linkClass = (active: boolean) =>
    cn(
      "text-sm uppercase tracking-wide transition-colors",
      active ? "text-white" : "text-white/70 hover:text-white",
    );

  const productsActive =
    location.pathname === "/products" || location.pathname.startsWith("/products/");

  const navWrap = useMemo(
    () =>
      cn(
        NAV_WRAP_BASE,
        navSolid
          ? "border-white/[0.06] bg-black/[0.85] backdrop-blur-[8px]"
          : "border-transparent bg-transparent backdrop-blur-0",
      ),
    [navSolid],
  );

  return (
    <header className={navWrap}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="font-bold tracking-widest text-white shrink-0 z-10">
          BBIT
        </Link>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link
            to="/#gallery"
            onClick={handleSectionClick("gallery")}
            className={linkClass(isSectionActive("gallery"))}
          >
            Gallery
          </Link>
          <Link
            to="/#services"
            onClick={handleSectionClick("services")}
            className={linkClass(isSectionActive("services"))}
          >
            Services
          </Link>
          <Link to="/products" className={linkClass(productsActive)}>
            Products
          </Link>
          <Link
            to="/#contact"
            onClick={handleSectionClick("contact")}
            className={linkClass(isSectionActive("contact"))}
          >
            Contact
          </Link>
        </nav>

        <div className="flex md:hidden absolute left-1/2 -translate-x-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 text-white/90 hover:text-white transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="min-w-[220px] border border-white/10 bg-neutral-950 text-white"
            >
              {MOBILE_ORDER.map((item) =>
                item.kind === "products" ? (
                  <DropdownMenuItem key="products" asChild className="focus:bg-white/10">
                    <Link to="/products" className="cursor-pointer uppercase tracking-wide text-sm">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.id} asChild className="focus:bg-white/10">
                    <Link
                      to={`/#${item.id}`}
                      className="cursor-pointer uppercase tracking-wide text-sm"
                      onClick={handleSectionClick(item.id)}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ),
              )}
              {user ? (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {staffUser ? (
                    <DropdownMenuItem asChild className="focus:bg-white/10">
                      <Link to="/barber-dashboard" className="cursor-pointer uppercase tracking-wide text-sm">
                        Barber Dashboard
                        {pendingBarberCount > 0 ? (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-sm bg-amber-500/90 text-black font-bold">
                            {pendingBarberCount}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild className="focus:bg-white/10">
                      <Link to="/dashboard" className="cursor-pointer uppercase tracking-wide text-sm">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-2 text-white transition-opacity duration-200 hover:opacity-90"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Sun className="h-4 w-4" strokeWidth={2} />
            )}
          </button>

          {user ? (
            <>
              {staffUser ? (
                <Link
                  to="/barber-dashboard"
                  className={cn(
                    "hidden md:inline text-sm uppercase tracking-wide transition-colors",
                    location.pathname === "/barber-dashboard" ? "text-white" : "text-white/70 hover:text-white",
                  )}
                >
                  Barber Dashboard
                  {pendingBarberCount > 0 ? (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs rounded-sm bg-amber-500/90 text-black font-bold">
                      {pendingBarberCount}
                    </span>
                  ) : null}
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className={cn(
                    "hidden md:inline text-sm uppercase tracking-wide transition-colors",
                    location.pathname === "/dashboard" ? "text-white" : "text-white/70 hover:text-white",
                  )}
                >
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="text-sm uppercase tracking-wide text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  "text-sm uppercase tracking-wide transition-colors",
                  location.pathname === "/login" ? "text-white" : "text-white/70 hover:text-white",
                )}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-white text-black px-3 sm:px-4 py-2 rounded-sm hover:bg-neutral-200 transition-colors font-semibold text-sm uppercase tracking-wide"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
