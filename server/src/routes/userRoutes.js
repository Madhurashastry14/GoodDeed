const express = require("express");
const Middleware = require("../middleware/authMiddleware");
const userController = require("../controller/userController");
const router = express.Router();

router.get("/profile", Middleware.authMiddleware, userController.getProfile);
router.get("/:id", userController.getPublicProfile);
router.patch(
  "/profile",
  Middleware.authMiddleware,
  userController.patchProfile,
);

router.patch(
  "/profile/password",
  Middleware.authMiddleware,
  userController.changePassword,
);
module.exports = router;
