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

/* ================================
   GET /api/system  (ALL PBX)
================================ */
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxGet(node, "/api/dashbaord/system/health");

      if (!response || !response.success) {
        throw new Error("Invalid system health payload");
      }

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        data: response, // FULL payload
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

/* ==========================================
   GET /api/system/property/:propertyId
========================================== */
router.get("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxGet(node, "/api/dashboard/system/health");

    if (!response || !response.success) {
      throw new Error("System health endpoint returned no data");
    }

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      data: response, // FULL payload
    });
  } catch (e) {
    res.status(500).json({
      pbx_id: pbxId,
      ok: false,
      error: e.message,
    });
  }
});

module.exports = router;
