const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

async function pbxGet(node, endpoint) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  });
  return res.data;
}

async function pbxPost(node, endpoint, data) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios.post(url, data, {
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  });
  return res.data;
}

async function pbxPut(node, endpoint, data) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios.put(url, data, {
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  });
  return res.data;
}

async function pbxDelete(node, endpoint) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios.delete(url, {
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  });
  return res.data;
}

// Get all packages from all PBX nodes
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxGet(node, "/api/packages");

      let packagesArray = [];
      if (response.data && response.data.data) {
        packagesArray = response.data.data;
      } else if (response.data) {
        packagesArray = response.data;
      } else if (Array.isArray(response)) {
        packagesArray = response;
      }

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        packages: packagesArray,
      });
    } catch (e) {
      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: false,
        error: e.message,
      });
    }
  }

  res.json(results);
});

// Get packages for a specific property (by pbx_id)
router.get("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxGet(node, "/api/packages");

    let packagesArray = [];
    if (response.data && response.data.data) {
      packagesArray = response.data.data;
    } else if (response.data) {
      packagesArray = response.data;
    } else if (Array.isArray(response)) {
      packagesArray = response;
    }

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      packages: packagesArray,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

// Get single package by ID
router.get("/property/:propertyId/package/:packageId", async (req, res) => {
  const { propertyId, packageId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxGet(node, `/api/packages/${packageId}`);

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      package: response.data || response,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

// Create new package
router.post("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxPost(node, "/api/packages", req.body);

    res.status(201).json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      package: response.data || response,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.response?.data?.message || e.message,
    });
  }
});

// Update package
router.put("/property/:propertyId/package/:packageId", async (req, res) => {
  const { propertyId, packageId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxPut(node, `/api/packages/${packageId}`, req.body);

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      package: response.data || response,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.response?.data?.message || e.message,
    });
  }
});

// Delete package
router.delete("/property/:propertyId/package/:packageId", async (req, res) => {
  const { propertyId, packageId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    await pbxDelete(node, `/api/packages/${packageId}`);

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      message: "Package deleted successfully",
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.response?.data?.message || e.message,
    });
  }
});

module.exports = router;