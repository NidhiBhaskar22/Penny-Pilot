import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import bgAuth from "../assests/bg_auth.jpg";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError("");
      await register({ name, email, password });
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(18,34,84,0.45),rgba(10,13,22,1)_56%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:grid-cols-[1.05fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden text-white lg:min-h-[640px]">
            <img
              src={bgAuth}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70" />
            <div className="relative z-10 flex h-full items-end p-8 lg:p-10">
              <div>
                <h2 className="text-4xl font-semibold leading-tight lg:text-5xl">
                  Build Better
                  <br />
                  Money Habits
                  <br />
                  From Day One
                </h2>
                <p className="mt-4 max-w-sm text-sm text-white/80">
                  Create your Penny Pilot account to organize spending, set goals,
                  and start tracking your finances with structure.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-white p-8 text-ink lg:p-12">
            <div className="w-full">
              <div className="mb-10 flex items-center justify-between">
                <div className="text-sm font-semibold text-ink/80">Penny Pilot</div>
                <div className="text-sm text-ink/60">Create Account</div>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight">Create Your Account</h1>
              <p className="mt-2 text-sm text-ink/60">
                Enter your details to get started with your personal finance workspace
              </p>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-black py-3 text-sm font-semibold text-white transition"
                >
                  Create Account
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-ink/60">
                Already have an account?{" "}
                <Link className="font-semibold text-ink" to="/login">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
