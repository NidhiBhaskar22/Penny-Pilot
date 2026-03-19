import { Mail, GithubIcon, LinkedinIcon } from "lucide-react";

export default function HomeFooter() {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-mist/55 md:flex-row md:px-8">
      <div className="font-semibold uppercase tracking-[0.18em]">Penny-Pilot</div>
      <div className="flex flex-col items-center gap-1 text-center md:items-end md:text-right">
        <a
          href="mailto:bhaskarnidhi2206@gmail.com"
          className="flex items-center gap-2 text-mist/70 transition hover:text-mist"
        >
          <Mail className="h-4 w-4" />
          <span>bhaskarnidhi2206@gmail.com</span>
        </a>
        <a
          href="https://github.com/NidhiBhaskar22"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-mist/70 transition hover:text-mist"
        >
          <GithubIcon className="h-4 w-4" />
          <span>GitHub</span>
        </a>
        <a
          href="https://www.linkedin.com/in/nidhi-bhaskar-682148229/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-mist/70 transition hover:text-mist"
        >
          <LinkedinIcon className="h-4 w-4" />
          <span>LinkedIn</span>
        </a>
      </div>
    </footer>
  );
}
