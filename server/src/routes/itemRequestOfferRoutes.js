const express = require("express");
const router = express.Router();

const controller = require("../controller/itemRequestOfferController");
const Middleware = require("../middleware/authMiddleware");

router.get("/me", Middleware.authMiddleware, controller.getMyOffers);

router.patch("/:id/accept", Middleware.authMiddleware, controller.acceptOffer);

router.patch("/:id/reject", Middleware.authMiddleware, controller.rejectOffer);

router.patch(
  "/:id/withdraw",
  Middleware.authMiddleware,
  controller.withdrawOffer,
);

router.patch("/:id/cancel", Middleware.authMiddleware, controller.cancelReservation);

router.patch(
  "/:id/handover",
  Middleware.authMiddleware,
  controller.updateHandover,
);

router.patch(
  "/:id/confirm-handover",
  Middleware.authMiddleware,
  controller.confirmHandover,
);

module.exports = router;
