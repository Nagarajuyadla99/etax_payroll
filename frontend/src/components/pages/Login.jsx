import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const users = [
    { username: "admin", password: "admin123", role: "Admin" },
    { username: "hr", password: "hr123", role: "HR" },
    { username: "finance", password: "fin123", role: "Finance" },
    { username: "manager", password: "mgr123", role: "Manager" },
    { username: "employee", password: "emp123", role: "Employee" },
    { username: "viewer", password: "view123", role: "Viewer" }
  ];

  const handleLogin = (e) => {
    e.preventDefault();

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      localStorage.setItem("token", "demo_token");
      localStorage.setItem("user", user.username);
      localStorage.setItem("role", user.role);

      nav("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 px-4">

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Company Login
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your credentials to access dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 
                         rounded-xl focus:outline-none focus:ring-2 
                         focus:ring-indigo-500 focus:border-indigo-500
                         transition duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 
                         rounded-xl focus:outline-none focus:ring-2 
                         focus:ring-indigo-500 focus:border-indigo-500
                         transition duration-200"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 
                       text-white font-semibold text-lg
                       hover:bg-indigo-700 transition duration-200
                       shadow-md hover:shadow-lg"
          >
            Login
          </button>

        </form>

      </div>
    </div>
  );
}
