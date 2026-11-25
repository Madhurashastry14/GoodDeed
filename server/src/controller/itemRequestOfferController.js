const offerService = require("../services/itemRequestOfferService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidId(res, label) {
  return res.status(400).json({
    error: `Valid ${label} ID is required`,
  });
}

function failure(res, error, fallback) {
  console.error(fallback, error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : fallback,
  });
}

async function createOffer(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "item request");
    }

    const offer = await offerService.createOffer(id, req.user.id, req.body ?? {});

    return res.status(201).json({
      message: "Fulfillment offer submitted",
      offer,
    });
  } catch (error) {
    return failure(res, error, "Unable to submit fulfillment offer");
  }
}

async function getRequestOffers(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "item request");
    }

    const data = await offerService.getReceivedOffers(id, req.user.id);

    return res.status(200).json(data);
  } catch (error) {
    return failure(res, error, "Unable to fetch fulfillment offers");
  }
}

async function getMyOffers(req, res) {
  try {
    const offers = await offerService.getMyOffers(req.user.id);

    return res.status(200).json({ offers });
  } catch (error) {
    return failure(res, error, "Unable to fetch your fulfillment offers");
  }
}

function action(handler, message, label) {
  return async function actionHandler(req, res) {
    try {
      const { id } = req.params;

      if (!UUID_REGEX.test(id)) {
        return invalidId(res, label);
      }

      const offer = await handler(id, req.user.id, req.body ?? {});

      return res.status(200).json({
        message:
          typeof message === "function" ? message(offer) : message,
        offer,
      });
    } catch (error) {
      return failure(res, error, "Unable to update fulfillment offer");
    }
  };
}

module.exports = {
  createOffer,
  getRequestOffers,
  getMyOffers,
  acceptOffer: action(
    (id, userId) => offerService.acceptOffer(id, userId),
    "Offer accepted and request reserved",
    "offer",
  ),
  rejectOffer: action(
    (id, userId) => offerService.rejectOffer(id, userId),
    "Offer rejected",
    "offer",
  ),
  withdrawOffer: action(
    (id, userId, body) => offerService.withdrawOffer(id, userId, body),
    "Offer withdrawn",
    "offer",
  ),
  cancelReservation: action(
    (id, userId) => offerService.cancelReservation(id, userId),
    "Reservation cancelled and request reopened",
    "offer",
  ),
  updateHandover: action(
    (id, userId, body) => offerService.updateHandover(id, userId, body),
    "Handover details updated",
    "offer",
  ),
  confirmHandover: action(
    (id, userId) => offerService.confirmHandover(id, userId),
    (offer) =>
      offer.status === "completed"
        ? "Fulfillment completed"
        : "Handover confirmed. Waiting for the other party.",
    "offer",
  ),
};
