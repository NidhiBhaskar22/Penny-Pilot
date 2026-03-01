import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      await register({ name, email, password });
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-md border border-teal bg-brand-900 p-6 text-mist shadow-md">
      <h1 className="mb-6 text-2xl font-semibold">Register</h1>
      {error && <div className="mb-4 text-sm text-red-300">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-teal px-4 py-2 font-semibold text-mist"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;

