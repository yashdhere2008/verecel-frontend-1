import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.role) parsed.role = parsed.role.toLowerCase();
      return parsed;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    const normalized = { ...userData, role: userData.role ? userData.role.toLowerCase() : userData.role };
    setUser(normalized);
    localStorage.setItem("user", JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
