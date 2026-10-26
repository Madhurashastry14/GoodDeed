const express = require("express");
const organizationController = require("../controller/organizationController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", authMiddleware, organizationController.createOrganization);

module.exports = router;
