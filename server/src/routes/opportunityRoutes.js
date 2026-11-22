const express = require("express");
const router = express.Router();

const opportunityController = require("../controller/opportunityController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, opportunityController.createOpportunity);

router.get(
  "/organization/:id",
  authMiddleware,
  opportunityController.getOrganizationOpportunities,
);

module.exports = router;
