const express = require("express");
const router = express.Router();

const itemClaimController = require("../controller/itemClaimController");
const Middleware = require("../middleware/authMiddleware");

router.get("/me", Middleware.authMiddleware, itemClaimController.getMyClaims);

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

module.exports = router;
