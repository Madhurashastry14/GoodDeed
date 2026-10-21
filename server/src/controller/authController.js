const authService = require("../services/authService");
const tokenService = require("../services/tokenService");
async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({
        message: "name is required",
      });
    } else if (typeof email !== "string" || email.trim() === "") {
      res.status(400).json({
        message: "email is required",
      });
    } else if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        message: "password is required",
      });
    }

    const user = await authService.createUser(
      name.trim(),
      email.trim().toLowerCase(),
      password,
    );

    res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ error: error.message });
    }
    console.error("Registration failed:", error.message);

    res.status(500).json({
      error: "Unable to register User",
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || email.trim() === "") {
      res.status(200).json({
        message: "email is required",
      });
    }

    if (typeof password !== "string" || password.trim() === "") {
      res.status(200).json({
        message: "password is required",
      });
    }
    const user = await authService.getUser(
      email.trim().toLowerCase(),
      password,
    );

    res.cookie("refreshToken", user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: user.user,
      accessToken: user.accessToken,
    });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        error: error.message,
      });
    }
    console.error("Login Failed", error.message);
    res.status(500).json({
      error: "Unable to login",
    });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh Token is missing",
      });
    }
    const accessToken = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({
      accessToken,
    });
  } catch (error) {
    if (error.statusCode === 401) {
      res.clearCookie("refreshtoken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "rpoduction",
        sameSite: "lax",
        path: "/api/auth",
      });

      res.status(401).json({
        error: "Invalid or expired refresh token",
      });
    }
    console.error("Token refresh failed", error.message);
    res.status(500).json({
      error: "Unable to refres token",
    });
  }
}

async function logout(req, res) {
  try {
    const refreshtoken = req.cookies?.refreshToken;
    if (refreshtoken) {
      await tokenService.revokeRefreshToken(refreshtoken);
    }
    res.clearCookie("refreshtoken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "rpoduction",
      sameSite: "lax",
      path: "/api/auth",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout failed:", error.message);
    return res.status(500).json({ error: "Unable to log out" });
  }
}

module.exports = { registerUser, loginUser, refresh, logout };
