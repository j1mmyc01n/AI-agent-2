/**
 * DoBetter Dashboard — Visual Reference Component
 *
 * This JSX file is the CANONICAL VISUAL TARGET for all DoBetter Viber
 * build-mode projects. Every generated HTML/CSS/JS project MUST replicate
 * this exact layout, color system, typography, and component hierarchy.
 *
 * Build mode generates plain HTML + CSS + vanilla JS — NOT React/JSX.
 * This file is a DESIGN REFERENCE ONLY. Use it to match the visual output.
 *
 * Design System tokens used here map 1:1 to the CSS custom properties in
 * DOBETTER_DESIGN_SYSTEM.md (light theme defaults).
 */

import React, { useState } from "react";

// ─── Design Tokens (map directly to CSS custom properties) ───────────────────
const tokens = {
  bg: "#F4F6FB",          // --bg
  sidebar: "#FFFFFF",      // --sidebar
  card: "#FFFFFF",         // --card
  border: "#E8ECF4",       // --border
  text: "#1A1D23",         // --text
  sub: "#6B7280",          // --sub
  accent: "#5B6EF5",       // --accent  (indigo)
  al: "#EEF0FE",           // --al      (accent light tint)
  success: "#22C55E",      // --success
  sl: "#DCFCE7",           // --sl
  warning: "#F59E0B",      // --warning
  wl: "#FEF3C7",           // --wl
  danger: "#EF4444",       // --danger
  dl: "#FEE2E2",           // --dl
  shadow: "0 1px 3px rgba(0,0,0,.06), 0 2px 10px rgba(0,0,0,.04)",
  shadowHover: "0 4px 16px rgba(91,110,245,.18)",
  radiusMd: "12px",
};

// ─── Sidebar Navigation Data ─────────────────────────────────────────────────
// These are the canonical sidebar items every generated dashboard MUST include
// (adapted per domain, but this structure is non-negotiable).
const NAV_ITEMS = [
  { hash: "#dashboard",  icon: "⊞",  label: "Dashboard",  active: true  },
  { hash: "#analytics",  icon: "📊", label: "Analytics"                 },
  { hash: "#ecommerce",  icon: "🛒", label: "E-Commerce"                },
  { hash: "#jobs",       icon: "💼", label: "Job Board"                 },
  { hash: "#finance",    icon: "$",  label: "Finance"                   },
  { hash: "#users",      icon: "👤", label: "Users"                     },
  { hash: "#calendar",   icon: "📅", label: "Calendar"                  },
  { hash: "#messages",   icon: "💬", label: "Messages"                  },
  { hash: "#settings",   icon: "⚙", label: "Settings"                  },
];

// ─── KPI Card Data ────────────────────────────────────────────────────────────
// Always use 4 KPI stat cards on the dashboard. Use specific (non-round) values.
const KPI_CARDS = [
  { label: "TOTAL REVENUE", value: "$84,254", trend: "+12.5%", trendDir: "up",   color: tokens.success  },
  { label: "ACTIVE USERS",  value: "47,291",  trend: "+8.3%",  trendDir: "up",   color: tokens.accent   },
  { label: "OPEN ORDERS",   value: "1,847",   trend: "-3.1%",  trendDir: "down", color: tokens.warning  },
  { label: "CHURN RATE",    value: "2.7%",    trend: "-0.4%",  trendDir: "down", color: tokens.danger   },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
function Sidebar({ activeHash = "#dashboard" }) {
  return (
    <aside style={{
      width: 230,
      minHeight: "100vh",
      background: tokens.sidebar,
      borderRight: `1px solid ${tokens.border}`,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 16px 16px",
        borderBottom: `1px solid ${tokens.border}`,
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 8,
          background: tokens.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
        }}>DB</div>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 17,
          color: tokens.text,
          letterSpacing: "-0.3px",
        }}>DoBetter</span>
        {/* Hamburger/collapse icon */}
        <span style={{ marginLeft: "auto", color: tokens.sub, cursor: "pointer", fontSize: 18 }}>≡</span>
      </div>

      {/* Nav section label */}
      <div style={{ padding: "16px 16px 6px", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.08em", color: tokens.sub, textTransform: "uppercase" }}>
        MAIN MENU
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.hash === activeHash;
          return (
            <a
              key={item.hash}
              href={item.hash}
              data-nav-item={item.hash}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: "none",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                color: isActive ? tokens.accent : tokens.text,
                background: isActive ? tokens.al : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: "12px 14px",
        borderTop: `1px solid ${tokens.border}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: tokens.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 700,
        }}>JC</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: tokens.text, lineHeight: 1.2 }}>
            Jimmy Coin
          </div>
          <div style={{ fontSize: 11, color: tokens.sub }}>Admin</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Topbar Component ─────────────────────────────────────────────────────────
function Topbar({ title = "Dashboard", breadcrumb = ["Home", "Dashboard"], userName = "Jimmy" }) {
  return (
    <div style={{
      height: 52,
      background: tokens.card,
      borderBottom: `1px solid ${tokens.border}`,
      display: "flex", alignItems: "center",
      padding: "0 24px",
      gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Title + greeting */}
      <div style={{ flex: 1 }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: 18,
          color: tokens.text, margin: 0, lineHeight: 1.2,
        }}>{title}</h1>
        <p style={{ fontSize: 12, color: tokens.sub, margin: 0 }}>
          Welcome back, {userName} 👋
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: tokens.sub, display: "flex", alignItems: "center", gap: 4 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb} style={{
            color: i === breadcrumb.length - 1 ? tokens.accent : tokens.sub,
            fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
          }}>
            {crumb}{i < breadcrumb.length - 1 && <span style={{ margin: "0 4px" }}>›</span>}
          </span>
        ))}
      </div>

      {/* Search icon */}
      <button style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${tokens.border}`,
        background: tokens.bg, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>🔍</button>
    </div>
  );
}

// ─── KPI Stat Card ────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendDir, accentColor, sparklineData = [] }) {
  const isUp = trendDir === "up";
  return (
    <div style={{
      background: tokens.card,
      border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radiusMd,
      padding: "16px 18px",
      boxShadow: tokens.shadow,
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      minWidth: 0,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        color: tokens.sub, textTransform: "uppercase", marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</div>

      {/* Value */}
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 700, fontSize: 26,
        color: tokens.text, lineHeight: 1.1,
      }}>{value}</div>

      {/* Trend */}
      <div style={{
        marginTop: 4, fontSize: 12,
        color: isUp ? tokens.success : tokens.danger,
        display: "flex", alignItems: "center", gap: 4,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <span>{isUp ? "↑" : "↓"}</span>
        <span style={{ fontWeight: 600 }}>{trend}</span>
        <span style={{ color: tokens.sub, fontWeight: 400 }}>vs last month</span>
      </div>

      {/* Sparkline (SVG) */}
      {sparklineData.length > 0 && (
        <svg width="100%" height="36" style={{ marginTop: 8, display: "block" }}
          viewBox={`0 0 ${sparklineData.length * 10} 36`} preserveAspectRatio="none">
          <polyline
            points={sparklineData.map((v, i) => `${i * 10},${36 - (v / Math.max(...sparklineData)) * 30}`).join(" ")}
            fill="none"
            stroke={accentColor || tokens.accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ title, subtitle, data = [], label = "Monthly performance" }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{
      background: tokens.card,
      border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radiusMd,
      padding: "18px 20px",
      boxShadow: tokens.shadow,
    }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: 15,
          color: tokens.text, margin: 0,
        }}>{title}</h3>
        <p style={{ fontSize: 12, color: tokens.sub, margin: "2px 0 0" }}>{subtitle || label}</p>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%",
              height: `${(d.value / max) * 64}px`,
              background: `${tokens.accent}33`,
              borderRadius: "4px 4px 0 0",
              minHeight: 4,
              transition: "height 0.3s ease",
            }} />
            <span style={{ fontSize: 9, color: tokens.sub, fontFamily: "'DM Sans', sans-serif" }}>
              {d.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Data Table ───────────────────────────────────────────────────────────────
function DataTable({ rows = [], columns = [] }) {
  return (
    <div style={{
      background: tokens.card,
      border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radiusMd,
      boxShadow: tokens.shadow,
      overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: tokens.bg }}>
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: "8px 14px", textAlign: "left",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: tokens.sub,
                  borderBottom: `1px solid ${tokens.border}`,
                }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{
                borderBottom: `1px solid ${tokens.border}`,
                transition: "background 0.15s ease",
              }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "10px 14px", fontSize: 13, color: tokens.text }}>
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
// ALWAYS use tinted background + colored text. NEVER solid color fills.
function Badge({ label, type = "info" }) {
  const styles = {
    success: { bg: tokens.sl, color: tokens.success },
    warning: { bg: tokens.wl, color: tokens.warning },
    danger:  { bg: tokens.dl, color: tokens.danger  },
    info:    { bg: tokens.al, color: tokens.accent   },
  };
  const s = styles[type] || styles.info;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
    }}>{label}</span>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
// This is the reference layout every "dashboard" route must replicate.
function DashboardPage() {
  const sparkline = [40, 55, 45, 60, 50, 70, 65, 80, 72, 90, 84];

  return (
    <main style={{
      flex: 1,
      background: tokens.bg,
      padding: "24px",
      overflowY: "auto",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* KPI row — 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {KPI_CARDS.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            trendDir={card.trendDir}
            accentColor={card.color}
            sparklineData={sparkline}
          />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <BarChart
          title="Revenue Overview"
          subtitle="Monthly performance"
          data={[
            { month: "Jan", value: 62000 },
            { month: "Feb", value: 71000 },
            { month: "Mar", value: 68000 },
            { month: "Apr", value: 75000 },
            { month: "May", value: 80000 },
            { month: "Jun", value: 84254 },
          ]}
        />
        <BarChart
          title="New Users"
          subtitle="Signups per month"
          data={[
            { month: "Jan", value: 3200 },
            { month: "Feb", value: 4100 },
            { month: "Mar", value: 3700 },
            { month: "Apr", value: 4800 },
            { month: "May", value: 5200 },
            { month: "Jun", value: 6300 },
          ]}
        />
      </div>

      {/* Data table */}
      <DataTable
        columns={[
          { key: "name",   label: "Name"    },
          { key: "role",   label: "Role"    },
          { key: "status", label: "Status"  },
          { key: "date",   label: "Joined"  },
        ]}
        rows={[
          { name: "Sarah Kim",       role: "VP Marketing",      status: <Badge label="Active"   type="success" />, date: "Mar 12, 2025" },
          { name: "Marcus Williams", role: "Lead Engineer",     status: <Badge label="Active"   type="success" />, date: "Jan 8, 2025"  },
          { name: "Priya Patel",     role: "Product Designer",  status: <Badge label="Invited"  type="info"    />, date: "Apr 2, 2025"  },
          { name: "Jordan Lee",      role: "Growth Manager",    status: <Badge label="Active"   type="success" />, date: "Feb 18, 2025" },
          { name: "Alex Chen",       role: "Data Analyst",      status: <Badge label="Inactive" type="warning" />, date: "Dec 3, 2024" },
        ]}
      />
    </main>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
// The full-page layout with sidebar + topbar + content area.
// This is the REQUIRED shell structure for every generated SaaS dashboard.
export default function App() {
  const [activeHash, setActiveHash] = useState("#dashboard");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: tokens.bg }}>
      {/* Sidebar: 230px expanded */}
      <Sidebar activeHash={activeHash} />

      {/* Right column: topbar + scrollable content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar title="Dashboard" breadcrumb={["Home", "Dashboard"]} userName="Jimmy" />
        <DashboardPage />
      </div>
    </div>
  );
}

/*
 * ─── HTML/CSS/JS IMPLEMENTATION NOTES ────────────────────────────────────────
 *
 * When generating the 8-file HTML/CSS/JS project, replicate this layout:
 *
 * index.html:
 *   <div id="app">
 *     <!-- Sidebar (230px) + Main wrapper -->
 *     <aside id="sidebar"></aside>
 *     <div id="main-wrapper">
 *       <header id="topbar"></header>
 *       <main id="main-content"></main>
 *     </div>
 *   </div>
 *
 * styles.css CSS variables (LIGHT theme default, dark swapped via [data-theme="dark"]):
 *   --bg: #F4F6FB;  --sidebar: #FFFFFF;  --card: #FFFFFF;
 *   --border: #E8ECF4;  --text: #1A1D23;  --sub: #6B7280;
 *   --accent: #5B6EF5;  --al: #EEF0FE;
 *   --radius-md: 12px;
 *   --shadow: 0 1px 3px rgba(0,0,0,.06), 0 2px 10px rgba(0,0,0,.04);
 *
 * Key layout rules:
 *   - Sidebar width: 230px (desktop), collapses to 0 or hamburger overlay on mobile
 *   - Topbar height: 52px, sticky, flex row
 *   - KPI grid: grid-template-columns: repeat(4, 1fr); gap: 16px
 *   - Charts row: grid-template-columns: 1fr 1fr; gap: 16px
 *   - Cards: border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--shadow)
 *   - Active nav item: background var(--al); color var(--accent); font-weight 600
 *   - Badges: tinted bg + colored text ONLY (never solid fills)
 *   - Fonts: Syne for headings/values; DM Sans for body/UI
 *
 * DARK MODE:
 *   Toggle [data-theme="dark"] on <html> element.
 *   --bg: #0F172A;  --sidebar: #1E293B;  --card: #1E293B;
 *   --border: #334155;  --text: #F1F5F9;  --sub: #94A3B8;
 *   --accent: #6366F1;  --al: #1E1B4B;
 *
 * REQUIRED SIDEBAR SECTIONS (adapt labels per domain, but keep this structure):
 *   MAIN MENU: Dashboard, Analytics, [primary feature], [secondary feature]
 *   MANAGEMENT: Users, [entity], Calendar, Messages
 *   SYSTEM: Settings
 *   FOOTER: User avatar + name + role
 */
