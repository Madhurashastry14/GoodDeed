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

router.patch(
  "/:id/publish",
  Middleware.authMiddleware,
  opportunityController.publishOpportunity,
);

router.get(
  "/:id",
  Middleware.optionalAuthMiddleware,
  opportunityController.getOpportunity,
);

router.patch(
  "/:id",
  Middleware.authMiddleware,
  opportunityController.patchOpportunity,
);

module.exports = router;
