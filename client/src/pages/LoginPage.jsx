import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import bgAuth from "../assests/bg_auth.jpg";

const LoginPage = () => {
  const { login, loginWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError("No Google credential received");
      return;
    }

    setError("");

    try {
      await loginWithGoogle(idToken);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    }
  };

  return (
    <div
      className="min-h-screen bg-[#111214] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgAuth})` }}
    >
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:grid-cols-[1.05fr_1fr]">
          <div
            className="relative min-h-[320px] bg-cover bg-center text-white lg:min-h-[640px]"
            style={{ backgroundImage: `url(${bgAuth})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70" />
            <div className="relative z-10 flex h-full items-end p-8 lg:p-10">
              <div>
                <h2 className="text-4xl font-semibold leading-tight lg:text-5xl">
                  Track Every
                  <br />
                  Penny with
                  <br />
                  Clarity
                </h2>
                <p className="mt-4 max-w-sm text-sm text-white/80">
                  Monitor spending, manage budgets, and stay on top of your financial
                  goals in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-white p-8 text-ink lg:p-12">
            <div className="w-full">
              <div className="mb-10 flex items-center justify-between">
                <div className="text-sm font-semibold text-ink/80">Penny Pilot</div>
                <div className="text-sm text-ink/60">Welcome Back</div>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight">Welcome Back</h1>
              <p className="mt-2 text-sm text-ink/60">
                Enter your email and password to access your account
              </p>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-black/5 bg-[#F4F5F7] px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-black/30 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-ink/70">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-black/20" />
                    Remember me
                  </label>
                  <button type="button" className="text-ink/70">
                    Forgot Password
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-black py-3 text-sm font-semibold text-white transition"
                >
                  Sign In
                </button>
                <div className="w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in failed")}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              </form>

              <p className="mt-8 text-center text-xs text-ink/60">
                Don&apos;t have an account?{" "}
                <Link className="font-semibold text-ink" to="/register">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

