const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controller/userController");
const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.get("/:id", userController.getPublicProfile);
router.patch("/profile", authMiddleware, userController.patchProfile);
module.exports = router;
