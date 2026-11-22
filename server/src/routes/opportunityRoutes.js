const express = require("express");
const router = express.Router();

const opportunityController = require("../controller/opportunityController");
const applicationController = require("../controller/applicationController");

const Middleware = require("../middleware/authMiddleware");

router.get("/", opportunityController.getPublicOpportunities);

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

router.patch(
  "/:id/cancel",
  Middleware.authMiddleware,
  opportunityController.cancelOpportunity,
);

router.patch(
  "/:id/complete",
  Middleware.authMiddleware,
  opportunityController.completeOpportunity,
);

router.post(
  "/:id/applications",
  Middleware.authMiddleware,
  applicationController.createApplication,
);

router.get(
  "/:id/applications",
  Middleware.authMiddleware,
  applicationController.getOpportunityApplications,
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

router.delete(
  "/:id",
  Middleware.authMiddleware,
  opportunityController.deleteOpportunity,
);

module.exports = router;
