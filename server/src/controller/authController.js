const authService = require("../services/authService");
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
    const user = await authService.getUser(email, password);

    res.status(200).json({
      message: "Login successful",
      user,
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

module.exports = { registerUser, loginUser };
