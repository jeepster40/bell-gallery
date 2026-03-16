import { useHashLocation } from "wouter/use-hash-location";
import { Camera, Images, Shield, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export default function NavBar() {
  const [loc] = useHashLocation();
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const linkStyle = (active: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.375rem 0.75rem",
    borderRadius: "var(--radius-full)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    textDecoration: "none",
    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
    background: active ? "rgba(192,80,112,0.08)" : "transparent",
    transition: "all 180ms ease",
  });

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "var(--color-bg)",
      borderBottom: "1px solid var(--color-divider)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 var(--space-6)",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <a href="#/" style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            textDecoration: "none",
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Bell Wedding Gallery">
              <circle cx="14" cy="14" r="13" stroke="var(--color-primary)" strokeWidth="1.5"/>
              <path d="M9 13.5C9 10.74 11.24 8.5 14 8.5C16.76 8.5 19 10.74 19 13.5V17.5H9V13.5Z" fill="var(--color-primary)" fillOpacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 17.5C12 18.6 12.9 19.5 14 19.5C15.1 19.5 16 18.6 16 17.5" stroke="var(--color-primary)" strokeWidth="1.5"/>
              <circle cx="14" cy="8" r="1" fill="var(--color-primary)"/>
              {/* Rings */}
              <path d="M6 21 C6 19.5 8 18.5 10 19 C10.8 19.2 11 20 10 20.5" stroke="var(--color-gold)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              <path d="M11 21 C11 19.5 13 18.5 15 19 C15.8 19.2 16 20 15 20.5" stroke="var(--color-gold)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            </svg>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: 500,
              color: "var(--color-text)",
              letterSpacing: "0.01em",
            }}>
              Mr. & Mrs. Bell
            </span>
          </a>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <a href="#/" style={linkStyle(loc === "/" || loc === "")} data-testid="nav-upload">
            <Camera size={15} />
            <span className="hidden sm:inline">Upload</span>
          </a>
          <a href="#/gallery" style={linkStyle(loc === "/gallery")} data-testid="nav-gallery">
            <Images size={15} />
            <span className="hidden sm:inline">Gallery</span>
          </a>
          <a href="#/admin" style={linkStyle(loc === "/admin")} data-testid="nav-admin">
            <Shield size={15} />
            <span className="hidden sm:inline">Admin</span>
          </a>

          <button
            onClick={() => setDark(!dark)}
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            data-testid="theme-toggle"
            style={{
              marginLeft: "var(--space-2)",
              padding: "0.375rem",
              borderRadius: "var(--radius-full)",
              color: "var(--color-text-muted)",
              display: "flex", alignItems: "center",
              transition: "color 180ms ease",
            }}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </nav>
      </div>
    </header>
  );
}
