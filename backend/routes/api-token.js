const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ================= HELPERS ================= */

async function pbxRequest(node, method, endpoint, data = null) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;

  const res = await axios({
    method,
    url,
    data,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${node.token}`,
      Accept: "application/json",
    },
  });

  return res.data;
}

/* =========================================================
   GET /api/tokens
   List tokens from ALL PBX nodes
========================================================= */
router.get("/", async (req, res) => {

  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      // Build the URL manually to log it
      const endpoint = "/api/tokens";
      const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
      const response = await pbxRequest(node, "get", endpoint);
      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        data: response.tokens ?? [],
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

/* =========================================================
   GET /api/tokens/property/:propertyId
========================================================= */
router.get("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  if (isNaN(pbxId)) {
    return res.status(400).json({ ok: false, error: "Invalid property ID" });
  }

  const nodes = await getPbxNodes();
  const node = nodes.find((n) => n.id === pbxId);

  if (!node) {
    return res.status(404).json({ ok: false, error: "Property not found" });
  }

  try {
    const response = await pbxRequest(node, "get", "/api/tokens");

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      data: response.tokens ?? [],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================================================
   POST /api/tokens/property/:propertyId
========================================================= */
router.post("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ ok: false, error: "Token name required" });
  }

  const nodes = await getPbxNodes();
  const node = nodes.find((n) => n.id === pbxId);

  if (!node) {
    return res.status(404).json({ ok: false, error: "Property not found" });
  }

  try {
    const response = await pbxRequest(node, "post", "/api/tokens", { name });

    res.status(201).json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      token: response.token,      // ⚠️ shown once
      token_id: response.token_id,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================================================
   DELETE /api/tokens/property/:propertyId/:tokenId
========================================================= */
router.delete("/property/:propertyId/:tokenId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  const tokenId = Number(req.params.tokenId);

  const nodes = await getPbxNodes();
  const node = nodes.find((n) => n.id === pbxId);

  if (!node) {
    return res.status(404).json({ ok: false, error: "Property not found" });
  }

  try {
    await pbxRequest(node, "delete", `/api/tokens/${tokenId}`);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
