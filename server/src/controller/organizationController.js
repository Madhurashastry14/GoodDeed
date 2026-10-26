const organizationService = require("../services/organizationService");
async function createOrganization(req, res) {
  try {
    const { name, description, city, website } = req.body;
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        error: "Organization name is required",
      });
    }
    if (typeof city !== "string" || city.trim() === "") {
      return res.status(400).json({
        error: "city name is required",
      });
    }
    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        error: "Invalid description",
      });
    }
    if (website != null && typeof website !== "string") {
      return res.status(400).json({ error: "Invalid website" });
    }

    const organization = await organizationService.createOrganization({
      name: name.trim(),
      description: description.trim() || null,
      city: city.trim(),
      website: website.trim() || null,
      userId: req.user.id,
    });

    return res.status(201).json({
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("Create organization failed:", error.message);
    return res.status(500).json({
      error: "Unable to create a organization",
    });
  }
}

module.exports = { createOrganization };
