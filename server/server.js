const express = require("express");
const pool = require("./src/config/db");

const app = express();
require("dotenv").config();
app.use(express.json());

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

const PORT = 3000 || process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
