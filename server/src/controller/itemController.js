const itemService = require("../services/itemService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getItems(req, res) {
  try {
    const items = await itemService.getItems(req.query);

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Get items failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to fetch items",
    });
  }
}

async function getMyItems(req, res) {
  try {
    const items = await itemService.getMyItems(req.user.id);

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Get my items failed:", error);

    return res.status(500).json({
      error: "Unable to fetch your items",
    });
  }
}

async function getItem(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid item ID is required",
      });
    }

    const data = await itemService.getItemById(id, req.user?.id ?? null);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Get item failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to fetch item",
    });
  }
}

async function createItem(req, res) {
  try {
    const item = await itemService.createItem(req.user.id, req.body);

    return res.status(201).json({
      message: "Item listed successfully",
      item,
    });
  } catch (error) {
    console.error("Create item failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to create item",
    });
  }
}

async function updateItem(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid item ID is required",
      });
    }

    const item = await itemService.updateItem(id, req.user.id, req.body);

    return res.status(200).json({
      message: "Item updated",
      item,
    });
  } catch (error) {
    console.error("Update item failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to update item",
    });
  }
}

async function closeItem(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid item ID is required",
      });
    }

    const item = await itemService.closeItem(id, req.user.id);

    return res.status(200).json({
      message: "Item closed",
      item,
    });
  } catch (error) {
    console.error("Close item failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to close item",
    });
  }
}

async function deleteItem(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid item ID is required",
      });
    }

    await itemService.deleteItem(id, req.user.id);

    return res.status(204).send();
  } catch (error) {
    console.error("Delete item failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to delete item",
    });
  }
}

module.exports = {
  getItems,
  getMyItems,
  getItem,
  createItem,
  updateItem,
  closeItem,
  deleteItem,
};
