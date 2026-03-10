import React, { useContext } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Menu } from "@headlessui/react";
import { AuthContext } from "../context/AuthContext";

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthed = !!user;

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
    <header className="absolute top-0 z-20 w-full border-b border-[#3a63b5]/35 bg-[rgba(3,8,38,0.72)] backdrop-blur-md">
      <div className="relative mx-auto flex max-w-[1200px] items-center gap-4 px-6 py-4">
        <RouterLink to="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide text-white [@media(prefers-color-scheme:light)]:text-black">
            PennyPilot
          </span>
        </RouterLink>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center justify-center gap-6 px-4 py-2 text-sm font-semibold tracking-wide md:flex">
      <RouterLink to="/" className="text-mist/70">
        Home
      </RouterLink>
      <RouterLink to="/about" className="text-mist/70">
        About
      </RouterLink>
      <RouterLink to="/dashboard" className="text-mist/70">
        Dashboard
      </RouterLink>
    </nav>

        <Menu as="div" className="relative ml-auto">
          <Menu.Button className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4f87df]/45 bg-[rgba(14,31,94,0.75)] text-mist">
            <span className="text-sm font-semibold">{initials}</span>
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-56 rounded-xl border border-[#3a63b5]/35 bg-[rgba(3,8,38,0.95)] p-2 text-sm text-mist shadow-lg">
            <div className="px-3 py-2">
              <div className="text-sm font-semibold">{user?.name || "Guest"}</div>
              <div className="text-xs text-mist/70">{user?.email || "-"}</div>
            </div>
            <div className="my-2 border-t border-white/10" />
            <Menu.Item>
              {({ active }) => (
                <RouterLink
                  to="/contact"
                  className={`block rounded-lg px-3 py-2 ${active ? "bg-white/10" : ""}`}
                >
                  Contact Us
                </RouterLink>
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
  );
};

export default Header;

