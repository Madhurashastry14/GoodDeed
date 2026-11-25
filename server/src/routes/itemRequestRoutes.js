const express = require("express");
const router = express.Router();

const itemRequestController = require("../controller/itemRequestController");
const itemRequestOfferController = require("../controller/itemRequestOfferController");
const Middleware = require("../middleware/authMiddleware");

router.get(
  "/me",
  Middleware.authMiddleware,
  itemRequestController.getMyRequests,
);

router.get("/", itemRequestController.getRequests);

router.post(
  "/",
  Middleware.authMiddleware,
  itemRequestController.createRequest,
);

router.get(
  "/:id/offers",
  Middleware.authMiddleware,
  itemRequestOfferController.getRequestOffers,
);

router.post(
  "/:id/offers",
  Middleware.authMiddleware,
  itemRequestOfferController.createOffer,
);

router.get(
  "/:id",
  Middleware.optionalAuthMiddleware,
  itemRequestController.getRequest,
);

router.patch(
  "/:id",
  Middleware.authMiddleware,
  itemRequestController.updateRequest,
);

router.patch(
  "/:id/submit",
  Middleware.authMiddleware,
  itemRequestController.submitRequest,
);

router.patch(
  "/:id/reopen",
  Middleware.authMiddleware,
  itemRequestController.reopenRequest,
);

router.patch(
  "/:id/cancel",
  Middleware.authMiddleware,
  itemRequestController.cancelRequest,
);

module.exports = router;
