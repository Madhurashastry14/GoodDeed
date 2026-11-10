const express = require("express");
const organizationController = require("../controller/organizationController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", organizationController.getOrganization);
router.post("/", authMiddleware, organizationController.createOrganization);
router.patch(
  "/:id",
  authMiddleware,
  organizationController.patchOrganizationDetail,
);
router.get("/mine", authMiddleware, organizationController.getMyOrganization);
router.get("/:id", organizationController.getOrganizationById);

router.get("/:id/members", organizationController.getOrganizationMembers);
router.post(
  "/:id/members",
  authMiddleware,
  organizationController.addOrganizationMember,
);

router.delete(
  "/:id/members/:userId",
  authMiddleware,
  organizationController.removemember,
);
module.exports = router;
