import React, { useContext, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Menu } from "@headlessui/react";
import { Moon, Sun } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import ContactUsModal from "./ContactUsModal";

const Header = ({ themeMode, setThemeMode }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthed = !!user;
  const [contactOpen, setContactOpen] = useState(false);
  const isDarkMode = themeMode === "dark";
  const initials =
    user?.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PP";

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  return (
    <>
      <header className="app-header absolute top-0 z-20 w-full backdrop-blur-md">
        <div className="relative mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-4">
          <RouterLink to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-wide text-mist">
              Penny Pilot
            </span>
          </RouterLink>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center gap-6 px-4 py-2 text-sm font-semibold tracking-wide md:flex">
            <RouterLink to="/" className="text-mist/70 transition hover:text-mist">
              Home
            </RouterLink>
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-mist/70 transition hover:text-mist"
            >
              Contact
            </button>
            <RouterLink to="/dashboard" className="text-mist/70 transition hover:text-mist">
              Dashboard
            </RouterLink>
          </nav>

          <Menu as="div" className="relative ml-auto">
            <Menu.Button className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4f87df]/45 bg-[rgb(var(--pp-panel-soft-rgb)/0.75)] text-mist">
              <span className="text-sm font-semibold">{initials}</span>
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-64 rounded-xl border border-[#3a63b5]/35 bg-[rgb(var(--pp-panel-rgb)/0.95)] p-2 text-sm text-mist shadow-lg">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{user?.name || "Guest"}</div>
                <div className="text-xs text-mist/70">{user?.email || "-"}</div>
              </div>
              <div className="my-2 border-t border-white/10" />
              <div className="px-3 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-mist/45">Theme</div>
                  <button
                    type="button"
                    onClick={() => setThemeMode(isDarkMode ? "light" : "dark")}
                    aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
                    title={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full border border-[#4f87df]/35 px-1 transition ${
                      isDarkMode
                        ? "bg-[rgb(var(--pp-panel-soft-rgb)/0.65)]"
                        : "bg-[rgb(var(--pp-panel-soft-rgb)/0.42)]"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between px-1 text-mist/70">
                      <Sun className="h-3.5 w-3.5" />
                      <Moon className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#22c0ff] text-[#03102e] shadow-sm transition-transform ${
                        isDarkMode ? "translate-x-8" : "translate-x-0"
                      }`}
                    >
                      {isDarkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </div>
              </div>
              <div className="my-2 border-t border-white/10" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className={`block w-full rounded-lg px-3 py-2 text-left ${active ? "bg-white/10" : ""}`}
                  >
                    Contact Us
                  </button>
                )}
              </Menu.Item>
              <div className="my-2 border-t border-white/10" />
              <Menu.Item>
                {({ active }) =>
                  isAuthed ? (
                    <button
                      onClick={handleLogout}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-red-300 ${
                        active ? "bg-white/10" : ""
                      }`}
                    >
                      Log out
                    </button>
                  ) : (
                    <RouterLink
                      to="/login"
                      className={`block w-full rounded-lg px-3 py-2 text-left text-cyan-300 ${
                        active ? "bg-white/10" : ""
                      }`}
                    >
                      Login
                    </RouterLink>
                  )
                }
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </header>

      <ContactUsModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
};

export default Header;
