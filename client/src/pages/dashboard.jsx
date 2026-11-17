import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/", { replace: true });
    }
  }

  return (
    <main style={{ padding: "50px" }}>
      <h1>Welcome to GoodDeed, {user?.name}!</h1>
      <p>You are successfully logged in.</p>

      <button onClick={handleLogout}>Log out</button>
    </main>
  );
}
