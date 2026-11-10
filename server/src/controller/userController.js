const userService = require("../services/userService");

async function getProfile(req, res) {
  try {
    const profile = await userService.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error("Get profile failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch profile",
    });
  }
}

module.exports = { getProfile };
