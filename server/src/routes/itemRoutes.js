const express = require("express");
const router = express.Router();

const itemController = require("../controller/itemController");
const itemClaimController = require("../controller/itemClaimController");
const Middleware = require("../middleware/authMiddleware");

router.get("/", itemController.getItems);

router.get("/mine", Middleware.authMiddleware, itemController.getMyItems);

router.post("/", Middleware.authMiddleware, itemController.createItem);

router.get(
  "/:id",
  Middleware.optionalAuthMiddleware,
  itemController.getItem,
);

router.patch("/:id", Middleware.authMiddleware, itemController.updateItem);

router.patch("/:id/close", Middleware.authMiddleware, itemController.closeItem);

router.delete("/:id", Middleware.authMiddleware, itemController.deleteItem);

router.post(
  "/:id/claims",
  Middleware.authMiddleware,
  itemClaimController.createClaim,
);

router.get(
  "/:id/claims",
  Middleware.authMiddleware,
  itemClaimController.getReceivedClaims,
);

module.exports = router;
