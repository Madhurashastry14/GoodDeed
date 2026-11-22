const express = require("express");
const router = express.Router();

const opportunityController = require("../controller/opportunityController");

const Middleware = require("../middleware/authMiddleware");

router.post(
  "/",
  Middleware.authMiddleware,
  opportunityController.createOpportunity,
);

router.get(
  "/organization/:id",
  Middleware.optionalAuthMiddleware,
  opportunityController.getOrganizationOpportunities,
);

module.exports = router;
