const express = require("express");
const router = express.Router();

const itemClaimController = require("../controller/itemClaimController");
const Middleware = require("../middleware/authMiddleware");

router.get("/me", Middleware.authMiddleware, itemClaimController.getMyClaims);

router.get("/:id", Middleware.authMiddleware, itemClaimController.getClaim);

router.patch(
  "/:id/accept",
  Middleware.authMiddleware,
  itemClaimController.acceptClaim,
);

router.patch(
  "/:id/reject",
  Middleware.authMiddleware,
  itemClaimController.rejectClaim,
);

router.patch(
  "/:id/withdraw",
  Middleware.authMiddleware,
  itemClaimController.withdrawClaim,
);

router.patch(
  "/:id/cancel",
  Middleware.authMiddleware,
  itemClaimController.cancelReservation,
);

router.patch(
  "/:id/handover",
  Middleware.authMiddleware,
  itemClaimController.updateHandover,
);

router.patch(
  "/:id/confirm-handover",
  Middleware.authMiddleware,
  itemClaimController.confirmHandover,
);

module.exports = router;
