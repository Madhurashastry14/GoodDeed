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

async function patchOrganizationDetail(req, res) {
  try {
    const organizationId = req.params.id;
    const updatedOrganization = await organizationService.patchOrganizationInfo(
      organizationId,
      req.user.id,
      req.body,
    );
    if (!updatedOrganization) {
      return res.status(404).json({
        error: "organization Not found",
      });
    }
    return res.status(200).json({
      message: "Organization updated successfully",
      updatedOrganization,
    });
  } catch (error) {
    console.error("Update organization failed:", error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to update organization",
    });
  }
}

async function getOrganization(req, res) {
  try {
    const organization = await organizationService.getOrganization();
    return res.status(200).json({
      organization,
    });
  } catch (error) {
    console.error("Get organization failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch organizations",
    });
  }
}

async function getOrganizationById(req, res) {
  try {
    const userId = req.params.id;
    const organization = await organizationService.getOrganizationById(userId);

    if (!organization) {
      return res.status(400).json({ error: "Organization not found" });
    }
    return res.status(200).json({ organization });
  } catch (error) {
    console.error("Get organization failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch organizations",
    });
  }
}

async function getMyOrganization(req, res) {
  try {
    const organizations = await organizationService.getMyOrganizations(
      req.user.id,
    );
    return res.status(200).json({
      organizations,
    });
  } catch (error) {
    console.error("Get organization failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch organizations",
    });
  }
}

async function getOrganizationMembers(req, res) {
  try {
    const organizationId = req.params.id;
    const organization =
      await organizationService.getOrganizationById(organizationId);
    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
      });
    }

    const members =
      await organizationService.getOrganizationMembers(organizationId);

    return res.status(200).json({
      members,
    });
  } catch (error) {
    console.error("Get organization members failed:", error.message);
    return res.status(500).json({
      error: "Unable to fetch organization members",
    });
  }
}

async function addOrganizationMember(req, res) {
  try {
    const organizationId = req.params.id;
    const { userId } = req.body;

    if (typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({
        error: "UserId is required",
      });
    }
    const member = await organizationService.addOrganizationMember(
      organizationId,
      userId.trim(),
      req.user.id,
    );

    return res.status(201).json({
      message: "Member created successfully",
      member,
    });
  } catch (error) {
    console.error("create organization members failed:", error.message);

    if (error.statusCode === 409) {
      return res.status(409).json({
        error: "Member already exist",
      });
    }
    return res.status(500).json({
      error: "Unable to create organization members",
    });
  }
}

async function removemember(req, res) {
  try {
    const organizationId = req.params.id;
    const userId = req.params.userId;

    if (typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({
        error: "UserId is required",
      });
    }

    const removedmember =
      await organizationService.removeMemberFromOrganization(
        organizationId,
        req.user.id,
        userId,
      );

    return res.status(200).json({
      message: "Member deleted successfully",
      removedmember,
    });
  } catch (error) {
    console.error("remove organization members failed:", error.message);

    if (error.statusCode === 403) {
      return res.status(403).json({
        error: error.message,
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: error.message,
      });
    }
    return res.status(500).json({
      error: "Unable to remove organization members",
    });
  }
}

module.exports = {
  createOrganization,
  patchOrganizationDetail,
  getOrganization,
  getOrganizationById,
  getMyOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removemember,
};
