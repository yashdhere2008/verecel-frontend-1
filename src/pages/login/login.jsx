import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPath } from "../../lib/roleRoutes";
import "./login.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [retried, setRetried] = useState(false);

  const submitLogin = async () => {
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedRole = role?.trim().toLowerCase();
    const normalizedRollNo = rollNo.trim();

    // Student validation
    if (normalizedRole === "student" && !normalizedRollNo) {
      setMessage("⚠ Please enter your Roll No.");
      return;
    }

    if (!normalizedEmail || !normalizedPassword) {
      setMessage("⚠ Please fill email and password!");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: normalizedEmail,
        password: normalizedPassword,
      };

      // Send role if selected
      if (normalizedRole) {
        payload.role = normalizedRole;
      }

      // Send Roll No. for student
      if (normalizedRole === "student") {
        payload.rollNo = normalizedRollNo;
      }

      const response = await API.post("/api/auth/login", payload);

      if (response.data.success) {
        setMessage("✅ Login successfully");

        const userData = response.data.user;

        /*
         * Store authentication information.
         * The actual issued-book data should remain in MongoDB.
         */
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));

        // Also keep roll number locally for quick identification
        if (userData?.rollNo) {
          localStorage.setItem("rollNo", userData.rollNo);
        } else if (normalizedRollNo) {
          localStorage.setItem("rollNo", normalizedRollNo);
        }

        /*
         * AuthContext receives the complete user.
         * Dashboard can then use user._id / rollNo to
         * fetch the user's existing issued books.
         */
        login(userData);

        // Allow AuthContext to update before ProtectedRoute checks
        setTimeout(() => {
          navigate(getDashboardPath(userData.role));
        }, 50);
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        "Login failed. Please try again.";

      const networkError = err.response ? null : err.message;

      if (networkError) {
        setMessage("⚠ Backend not reachable. Please start the server.");
      } else {
        setMessage(
          "⚠ " +
            serverMsg +
            (import.meta.env.VITE_DEBUG_API === "true"
              ? ` — ${JSON.stringify(
                  err.response?.data || serverMsg
                )}`
              : "")
        );
      }

      // If server suggests expected role, retry once
      const expected = err.response?.data?.expectedRole;

      if (expected && !retried) {
        setRole(expected);
        setRetried(true);

        setTimeout(() => {
          submitLogin();
        }, 200);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setRetried(false);
    submitLogin();
  };


  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const normalizedRole =
      role && role.trim()
        ? role.trim().toLowerCase()
        : "student";

    const normalizedRollNo = rollNo.trim();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage("⚠ Please fill all registration fields.");
      return;
    }

    // Roll No. required for students
    if (normalizedRole === "student" && !normalizedRollNo) {
      setMessage("⚠ Please enter your Roll No.");
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: normalizedRole,
      };

      // Add Roll No. for students
      if (normalizedRole === "student") {
        registrationData.rollNo = normalizedRollNo;
      }

      const response = await API.post(
        "/api/auth/register",
        registrationData
      );

      if (response.data) {
        setMessage("✅ Account Created Successfully!");

        /*
         * Keep the entered roll number so it is already
         * available if the user switches back to Login.
         */
        setTimeout(() => {
          setMode("login");
          setMessage("");
        }, 1500);
      }
    } catch (err) {
      setMessage(
        "⚠ " +
          (err.response?.data?.message ||
            "Registration failed.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setMessage("📧 Password Reset Link Sent!");
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;

    setRole(selectedRole);

    /*
     * Roll No. is only required for students.
     * Clear it when switching to admin/librarian.
     */
    if (selectedRole !== "student") {
      setRollNo("");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">

        {/* =========================
            LOGIN
        ========================== */}
        <div
          className={`form ${
            mode === "login" ? "active" : ""
          }`}
        >
          <h2>I ❤️ Library</h2>
          <p className="subtitle">
            Login to continue...
          </p>

          {/* ROLE */}
          <div className="input-box">
            <select
              value={role}
              onChange={handleRoleChange}
            >
              <option value="">Select Role</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
            </select>
          </div>

          {/* ROLL NO. - STUDENT ONLY */}
          {role === "student" && (
            <div className="input-box">
              <input
                type="text"
                value={rollNo}
                onChange={(e) =>
                  setRollNo(e.target.value)
                }
                placeholder="Roll No."
                autoComplete="username"
              />
            </div>
          )}

          {/* EMAIL */}
          <div className="input-box">
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Email"
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}
          <div className="input-box">
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Processing..." : "Login"}
          </button>

          <div className="links">
            <a
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Create Account
            </a>{" "}
            |{" "}
            <a
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
            >
              Forgot Password?
            </a>
          </div>

          <div
            className="message"
            style={{
              color: message.startsWith("⚠")
                ? "salmon"
                : "lightgreen",
            }}
          >
            {message}
          </div>
        </div>

        {/* =========================
            REGISTER
        ========================== */}
        <div
          className={`form ${
            mode === "register" ? "active" : ""
          }`}
        >
          <h2>Create Account</h2>

          {/* NAME */}
          <div className="input-box">
            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Full Name"
            />
          </div>

          {/* EMAIL */}
          <div className="input-box">
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Email"
            />
          </div>

          {/* ROLE */}
          <div className="input-box">
            <select
              value={role}
              onChange={handleRoleChange}
            >
              <option value="">Select Role</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
            </select>
          </div>

          {/* ROLL NO. - STUDENT ONLY */}
          {role === "student" && (
            <div className="input-box">
              <input
                type="text"
                value={rollNo}
                onChange={(e) =>
                  setRollNo(e.target.value)
                }
                placeholder="Roll No."
              />
            </div>
          )}

          {/* PASSWORD */}
          <div className="input-box">
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Processing..." : "Register"}
          </button>

          <div className="links">
            <a
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Back to Login
            </a>
          </div>

          <div
            className="message"
            style={{
              color: message.startsWith("⚠")
                ? "salmon"
                : "lightgreen",
            }}
          >
            {message}
          </div>
        </div>

        {/* =========================
            FORGOT PASSWORD
        ========================== */}
        <div
          className={`form ${
            mode === "forgot" ? "active" : ""
          }`}
        >
          <h2>Forgot Password</h2>

          <div className="input-box">
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
            />
          </div>

          <button onClick={handleResetPassword}>
            Reset Password
          </button>

          <div className="links">
            <a
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Back to Login
            </a>
          </div>

          <div
            className="message"
            style={{
              color: message.startsWith("⚠")
                ? "salmon"
                : "lightgreen",
            }}
          >
            {message}
          </div>
        </div>

      </div>
    </div>
  );
};
export default LoginPage;