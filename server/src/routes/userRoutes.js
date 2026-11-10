const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controller/userController");
const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);

module.exports = router;
