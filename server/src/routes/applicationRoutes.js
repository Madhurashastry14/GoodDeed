const express = require("express");
const router = express.Router();

const applicationController = require("../controller/applicationController");
const Middleware = require("../middleware/authMiddleware");

router.get(
  "/mine",
  Middleware.authMiddleware,
  applicationController.getMyApplications,
);

router.patch(
  "/:id/accept",
  Middleware.authMiddleware,
  applicationController.acceptApplication,
);

router.patch(
  "/:id/reject",
  Middleware.authMiddleware,
  applicationController.rejectApplication,
);

router.patch(
  "/:id/withdraw",
  Middleware.authMiddleware,
  applicationController.withdrawApplication,
);

module.exports = router;
