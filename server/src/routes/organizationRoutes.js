const express = require("express");
const organizationController = require("../controller/organizationController");
const Middleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", organizationController.getOrganization);
router.post(
  "/",
  Middleware.authMiddleware,
  organizationController.createOrganization,
);
router.patch(
  "/:id",
  Middleware.authMiddleware,
  organizationController.patchOrganizationDetail,
);
router.get(
  "/mine",
  Middleware.authMiddleware,
  organizationController.getMyOrganization,
);
router.get(
  "/:id/dashboard",
  Middleware.authMiddleware,
  organizationController.getOrganizationDashboard,
);
router.get("/:id", organizationController.getOrganizationById);
router.delete(
  "/:id",
  Middleware.authMiddleware,
  organizationController.deleteOrganization,
);

router.get("/:id/members", organizationController.getOrganizationMembers);
router.post(
  "/:id/members",
  Middleware.authMiddleware,
  organizationController.addOrganizationMember,
);

router.delete(
  "/:id/members/:userId",
  Middleware.authMiddleware,
  organizationController.removemember,
);
module.exports = router;
