import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";
import Navbar from "./navbar";
import { useAuth } from "../context/authContext";

export default function ComingSoon({ title }) {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Navbar />

      <main
        style={{
          minHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "40px 20px",
          background: "#fafbf7",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          style={{
            background: "#e8f3e9",
            color: "#176c3b",
            padding: 20,
            borderRadius: 20,
            marginBottom: 24,
          }}
        >
          <Construction size={35} />
        </div>

        <h1 style={{ color: "#183b28", marginBottom: 12 }}>{title}</h1>

        <p style={{ color: "#718473", maxWidth: 420 }}>
          We're building this feature to make helping your community even
          easier. Check back soon.
        </p>

        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          style={{
            marginTop: 25,
            color: "#176c3b",
            fontWeight: 700,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ArrowLeft size={17} />
          {isAuthenticated ? "Back to dashboard" : "Back to GoodDeed"}
        </Link>
      </main>
    </>
  );
}
