import { Link as RouterLink } from "react-router-dom";

export default function HomeFooter() {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-mist/55 md:flex-row md:px-8">
      <div className="font-semibold uppercase tracking-[0.18em]">Penny-Pilot</div>
      <div className="flex flex-wrap items-center justify-center gap-5">
        <RouterLink to="/" className="hover:text-mist">
          Features
        </RouterLink>
        <RouterLink to="/login" className="hover:text-mist">
          Login
        </RouterLink>
        <RouterLink to="/register" className="hover:text-mist">
          Sign Up
        </RouterLink>
      </div>
    </footer>
  );
}
