const express = require("express");
const router = express.Router();

const opportunityController = require("../controller/opportunityController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, opportunityController.createOpportunity);

module.exports = router;
