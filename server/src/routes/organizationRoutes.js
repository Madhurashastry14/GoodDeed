const express = require("express");
const organizationController = require("../controller/organizationController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", organizationController.getOrganization);
router.post("/", authMiddleware, organizationController.createOrganization);
router.get("/mine", authMiddleware, organizationController.getMyOrganization);
router.get("/:id", organizationController.getOrganizationById);

router.get("/:id/members", organizationController.getOrganizationMembers);
router.post(
  "/:id/members",
  authMiddleware,
  organizationController.addOrganizationMember,
);

module.exports = router;
