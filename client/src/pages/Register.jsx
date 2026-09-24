import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      errors.phone = "Enter a valid 10-digit phone number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    try {
      const res = await api.post("/auth/register", formData);
      setSuccess(res.data.message || "Registered successfully!");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100"
      >
        <h2 className="text-2xl font-bold mb-1 text-center text-indigo-700">
          Create Account
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">Join as a resident</p>

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded px-3 py-2">
            {success}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              fieldErrors.name ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-400"
            }`}
            placeholder="John Doe"
          />
          {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              fieldErrors.email ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-400"
            }`}
            placeholder="you@example.com"
          />
          {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              fieldErrors.password ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-400"
            }`}
            placeholder="At least 6 characters"
          />
          {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              fieldErrors.phone ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-indigo-400"
            }`}
            placeholder="10-digit number (optional)"
          />
          {fieldErrors.phone && <p className="text-red-500 text-xs mt-1">{fieldErrors.phone}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          Register
        </button>

        <p className="text-center text-sm mt-5 text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-indigo-600 font-medium hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

export default Register;