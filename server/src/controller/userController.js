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

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || currentPassword.trim() === "") {
      return res.status(400).json({
        message: "current password is required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.trim() === "") {
      return res.status(400).json({
        message: "new password is required",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "new password should be different from the currect password",
      });
    }
    await userService.patchPassword(req.user.id, currentPassword, newPassword);

    return res
      .status(200)
      .json({ message: "Password changed successfully. please log in again" });
  } catch (error) {
    console.error("change password failed:", error.message);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to change password",
    });
  }
}

module.exports = { getProfile, getPublicProfile, patchProfile, changePassword };
