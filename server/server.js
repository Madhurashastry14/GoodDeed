const express = require("express");
const cors = require("cors");
const pool = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const organizationRoutes = require("./src/routes/organizationRoutes");
const opportunityRoutes = require("./src/routes/opportunityRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const itemRoutes = require("./src/routes/itemRoutes");
const itemClaimRoutes = require("./src/routes/itemClaimRoutes");
const cookieparser = require("cookie-parser");
const app = express();
require("dotenv").config();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
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
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/opportunity-applications", applicationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/item-claims", itemClaimRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

const PORT = 3000 || process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
