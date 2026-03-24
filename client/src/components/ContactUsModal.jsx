import React, { useEffect } from "react";
import { Mail, GithubIcon, LinkedinIcon } from "lucide-react";

const CONTACT_EMAIL = "bhaskarnidhi2206@gmail.com";
const GITHUB_URL = "https://github.com/NidhiBhaskar22";
const LINKEDIN_URL = "https://www.linkedin.com/in/nidhi-bhaskar-682148229/";

export default function ContactUsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--pp-ink-rgb)/0.42)] px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />

      <div className="app-modal relative w-full max-w-xl overflow-hidden rounded-[28px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,192,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,198,111,0.12),transparent_28%)]" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">
                Contact Us
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-mist">Reach out to PennyPilot</h2>
              <p className="mt-2 text-sm leading-6 text-mist/72">
                Contact details are shown below.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mist"
              aria-label="Close contact modal"
            >
              x
            </button>
          </div>

          <div className="mt-6 space-y-4">
            

            <div className="app-surface-soft rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
                Contact Links
              </div>
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 text-mist/80 transition hover:text-mist"
                >
                  <Mail className="h-4 w-4" />
                  <span className="break-all">{CONTACT_EMAIL}</span>
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-mist/80 transition hover:text-mist"
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>GitHub</span>
                </a>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-mist/80 transition hover:text-mist"
                >
                  <LinkedinIcon className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>

          

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl bg-[#22c0ff] px-5 py-2 text-sm font-semibold text-[#03102e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
