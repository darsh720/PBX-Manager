const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

async function pbxGet(node, endpoint, params = {}) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${node.token}` },
    params,
    timeout: 60000,
  });
  return res.data;
}

/* =====================================================
   GET /api/cdrs
   → CDRs from ALL PBX nodes
===================================================== */
router.get("/", async (req, res) => {
  const { page = 1 } = req.query;
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxGet(node, "/api/cdrs", { page });

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        data: response.data, // Laravel paginator
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

/* =====================================================
   GET /api/cdrs/property/:propertyId
   → CDRs from SINGLE PBX
===================================================== */
router.get("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  const { page = 1 } = req.query;

  if (isNaN(pbxId)) {
    return res.status(400).json({ error: "Invalid property ID" });
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxGet(node, "/api/cdrs", { page });

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      data: response.data,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

module.exports = router;
