import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const slides = [
  {
    title: "Welcome to PennyPilot",
    body: "Track income, expenses, and investments effortlessly.",
  },
  {
    title: "See Your Limits",
    body: "Set monthly/weekly/daily budgets and get alerts before you overspend.",
  },
  {
    title: "Start with a Baseline",
    body: "We will begin with your current bank balance, then keep it updated.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [notice, setNotice] = useState("");
  const { completeProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, slides.length));
  const skip = () => setStep(slides.length);

  const save = async () => {
    try {
      await completeProfile({
        name,
        balance: Number(balance),
      });
      navigate("/dashboard");
    } catch (e) {
      setNotice(e?.response?.data?.message || "Failed to save");
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-[560px] rounded-lg border border-teal bg-brand-900 p-6 text-mist">
      {notice ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {notice}
        </div>
      ) : null}

      {step < slides.length ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">{slides[step].title}</h2>
          <p className="text-mist/80">{slides[step].body}</p>
          <div className="flex items-center justify-between">
            <button className="rounded-lg border border-white/20 px-4 py-2 text-sm" onClick={skip}>
              Skip
            </button>
            <button className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold" onClick={next}>
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">Just two quick details</h2>
          <div>
            <div className="mb-2 text-sm">Name *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-2 text-sm">Current Bank Balance *</div>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="e.g., 120000"
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-white/20 px-4 py-2 text-sm"
              onClick={() => navigate("/dashboard")}
            >
              Skip for now
            </button>
            <button
              className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold disabled:opacity-60"
              onClick={save}
              disabled={!name || balance === ""}
            >
              Save & Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
