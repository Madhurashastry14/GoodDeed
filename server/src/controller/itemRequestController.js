const itemRequestService = require("../services/itemRequestService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidId(res) {
  return res.status(400).json({
    error: "Valid item request ID is required",
  });
}

function failure(res, error, fallback) {
  console.error(fallback, error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : fallback,
  });
}

async function createRequest(req, res) {
  try {
    const request = await itemRequestService.createItemRequest(
      req.user.id,
      req.body ?? {},
    );

    return res.status(201).json({
      message: "Item request saved as draft",
      request,
    });
  } catch (error) {
    return failure(res, error, "Unable to create item request");
  }
}

async function getRequests(req, res) {
  try {
    const data = await itemRequestService.getPublicItemRequests(req.query);

    return res.status(200).json(data);
  } catch (error) {
    return failure(res, error, "Unable to fetch item requests");
  }
}

async function getMyRequests(req, res) {
  try {
    const requests = await itemRequestService.getMyItemRequests(req.user.id);

    return res.status(200).json({ requests });
  } catch (error) {
    return failure(res, error, "Unable to fetch your item requests");
  }
}

async function getRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const detail = await itemRequestService.getItemRequestDetail(
      id,
      req.user?.id ?? null,
    );

    return res.status(200).json(detail);
  } catch (error) {
    return failure(res, error, "Unable to fetch item request");
  }
}

async function updateRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const result = await itemRequestService.updateItemRequest(
      id,
      req.user.id,
      req.body ?? {},
    );

    return res.status(200).json({
      message: result.reverification_required
        ? "Item request updated and submitted for verification"
        : "Item request updated",
      request: result.request,
      reverification_required: result.reverification_required,
    });
  } catch (error) {
    return failure(res, error, "Unable to update item request");
  }
}

async function submitRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const request = await itemRequestService.submitItemRequest(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Item request submitted for verification",
      request,
    });
  } catch (error) {
    return failure(res, error, "Unable to submit item request");
  }
}

async function reopenRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const request = await itemRequestService.reopenItemRequest(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Item request reopened as a draft",
      request,
    });
  } catch (error) {
    return failure(res, error, "Unable to reopen item request");
  }
}

async function cancelRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const request = await itemRequestService.cancelItemRequest(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Item request cancelled",
      request,
    });
  } catch (error) {
    return failure(res, error, "Unable to cancel item request");
  }
}

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  getRequest,
  updateRequest,
  submitRequest,
  reopenRequest,
  cancelRequest,
};
