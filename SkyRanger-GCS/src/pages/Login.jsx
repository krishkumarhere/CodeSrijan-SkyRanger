import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Loader2, User, Lock } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { setToken, setRole } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();

      // Store token & role
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);
      setToken(data.access_token);
      setRole(data.role);

      // Smooth transition
      setTimeout(() => navigate("/", { replace: true }), 300);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] relative overflow-hidden">
      {/* Animated background - subtle moving grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0a0c1f] to-gray-900 opacity-80" />
        <div className="absolute inset-0 cyber-grid opacity-[0.02] pointer-events-none" />
      </div>

      {/* Glass-morphism card */}
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm p-8 space-y-6 bg-[#070b14]/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-in fade-in duration-500"
      >
        <h2 className="text-center font-outfit text-3xl font-black text-white tracking-wider">
          SkyRanger GCS
        </h2>

        <p className="text-center text-gray-400 font-mono text-[10px] uppercase">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            "Secure access - operator or viewer"
          )}
        </p>

        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Username"
              className="w-full px-10 py-2 bg-[#0d1117]/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <User size={16} className="text-gray-500" />
            </div>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-10 py-2 bg-[#0d1117]/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-gray-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/70 hover:bg-blue-500 transition-colors font-mono text-sm font-black text-white uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Signing in...</span>
              </>
            ) : (
              "Login"
            )}
          </button>
        </div>

        {/* Role hint */}
        <div className="text-center text-gray-500 font-mono text-[10px]">
          Operator: <span className="text-cyan-400">krish</span> / <span className="text-cyan-400">krish</span> <br />
          Viewer: <span className="text-cyan-400">viewer</span> / <span className="text-cyan-400">viewer</span>
        </div>
      </form>
    </div>
  );
};

export default Login;
