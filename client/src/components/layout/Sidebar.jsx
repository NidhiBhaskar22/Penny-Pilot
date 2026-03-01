import React, { useContext } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

/** Simple inline SVG icons (no extra deps) */
const Icon = ({ path, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={path} />
  </svg>
);
const IGrid = (p) => (
  <Icon path="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" {...p} />
);
const IArrowUp = (p) => <Icon path="M12 19V5m0 0l-7 7m7-7l7 7" {...p} />;
const IArrowDown = (p) => <Icon path="M12 5v14m0 0l7-7m-7 7l-7-7" {...p} />;
const IChart = (p) => <Icon path="M3 20h18M6 16V8m6 16V4m6 16v-6" {...p} />;
const IShield = (p) => (
  <Icon path="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" {...p} />
);
const IBank = (p) => (
  <Icon path="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M2 18h20M12 3l9 5H3l9-5z" {...p} />
);

const NavItem = ({ to, icon, label, active, collapsed }) => {
  const content = (
    <RouterLink
      to={to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
        active
          ? "border border-[#4f87df]/50 bg-[rgba(14,31,94,0.85)] text-white"
          : "text-mist/80"
      }`}
    >
      {icon}
      {!collapsed && <span className={`font-medium ${active ? "font-semibold" : ""}`}>{label}</span>}
    </RouterLink>
  );

  return collapsed ? (
    <div className="group relative">
      {content}
      <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0">
        {label}
      </div>
    </div>
  ) : (
    content
  );
};

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthed = !!user;

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: <IGrid className="h-5 w-5" /> },
    { to: "/income", label: "Income", icon: <IArrowDown className="h-5 w-5" /> },
    { to: "/expense", label: "Expense", icon: <IArrowUp className="h-5 w-5" /> },
    { to: "/investment", label: "Investment", icon: <IChart className="h-5 w-5" /> },
    { to: "/limits", label: "Limits", icon: <IShield className="h-5 w-5" /> },
    { to: "/accounts", label: "Accounts", icon: <IBank className="h-5 w-5" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside
      className="fixed left-0 top-0 z-[15] h-screen border-r border-[#3a63b5]/30 bg-[rgba(3,8,38,0.88)] text-mist backdrop-blur-md"
      style={{ width: collapsed ? 76 : 260 }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(96,146,255,0.12) 36px), repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(96,146,255,0.12) 36px)",
        }}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between px-3 pb-3 pt-4">
          {!collapsed ? (
            <RouterLink to="/" className="text-sm font-semibold tracking-wide text-mist">
              PennyPilot
            </RouterLink>
          ) : (
            <div className="h-5 w-5" />
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.85)] text-mist"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              {collapsed ? (
                <path d="m9 18 6-6-6-6" />
              ) : (
                <path d="m15 18-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        <div className="flex-1 px-2 pt-6">
          <div className="flex flex-col gap-1.5">
            {items.map((it) => (
              <NavItem
                key={it.to}
                to={it.to}
                label={it.label}
                icon={it.icon}
                collapsed={collapsed}
                active={location.pathname.startsWith(it.to)}
              />
            ))}
          </div>
        </div>

        <div className="relative px-2 pb-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#3a63b5]/35 bg-[rgba(7,16,58,0.78)] px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c0ff] text-[#03102e]">
              {(user?.name || "G")[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user?.name || "Guest"}</div>
                <div className="truncate text-xs text-mist/70">{user?.email || "-"}</div>
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            {isAuthed ? (
              <button
                onClick={handleLogout}
                className="w-full rounded-lg bg-red-600/80 px-3 py-2 text-sm font-semibold text-white"
              >
                Logout
              </button>
            ) : (
              <>
                <RouterLink
                  to="/login"
                  className="w-full rounded-lg bg-[#22c0ff] px-3 py-2 text-center text-sm font-semibold text-[#03102e]"
                >
                  Login
                </RouterLink>
                {!collapsed && (
                  <RouterLink
                    to="/register"
                    className="w-full rounded-lg border border-white/20 px-3 py-2 text-center text-sm font-semibold text-mist"
                  >
                    Register
                  </RouterLink>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

