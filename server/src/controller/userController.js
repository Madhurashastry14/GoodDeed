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

async function getPublicProfile(req, res) {
  try {
    const profile = await userService.getPublicProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error("Get public profile failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch public profile",
    });
  }
}

async function patchProfile(req, res) {
  try {
    const { bio, city, interests } = req.body;
    if (bio === undefined && city === undefined && interests === undefined) {
      return res.status(400).json({
        error: "provide atleast one field to update",
      });
    }

    const updatedProfile = await userService.patchProfile(req.user.id, {
      bio,
      city,
      interests,
    });
    if (!updatedProfile) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      updatedProfile,
    });
  } catch (error) {
    console.error("update profile failed:", error.message);
    return res.status(500).json({
      error: "Unable to update profile",
    });
  }
}

module.exports = { getProfile, getPublicProfile, patchProfile };
