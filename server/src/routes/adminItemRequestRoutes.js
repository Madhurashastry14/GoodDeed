const express = require("express");
const router = express.Router();

const controller = require("../controller/itemRequestReviewController");
const Middleware = require("../middleware/authMiddleware");
const { requireReviewer } = require("../middleware/reviewerMiddleware");

// Available to any authenticated user so the client can gate its reviewer
// route. Every review action below is enforced again on the server.
router.get("/access", Middleware.authMiddleware, controller.getAccess);

router.get(
  "/pending",
  Middleware.authMiddleware,
  requireReviewer,
  controller.getPending,
);

router.get(
  "/:id",
  Middleware.authMiddleware,
  requireReviewer,
  controller.getReviewRequest,
);

router.patch(
  "/:id/approve",
  Middleware.authMiddleware,
  requireReviewer,
  controller.approve,
);

router.patch(
  "/:id/reject",
  Middleware.authMiddleware,
  requireReviewer,
  controller.reject,
);

router.patch(
  "/:id/request-changes",
  Middleware.authMiddleware,
  requireReviewer,
  controller.requestChanges,
);

module.exports = router;
