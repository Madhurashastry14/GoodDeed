const express = require("express");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const cookieparser = require("cookie-parser");
const app = express();
require("dotenv").config();
app.use(express.json());
app.use(cookieparser());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.status(200).json({
      success: true,
      server: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.log("Health check failed", error.message);
    res.status(503).json({
      server: "healthy",
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

const PORT = 3000 || process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
