const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx"); // Helper to get PBX credentials

const router = express.Router();

/* ================= HELPER ================= */
async function pbxRequest(node, method, endpoint, data = null) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const options = {
    method,
    url,
    data,
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  };

  try {
    const res = await axios(options);
    return res.data;
  } catch (e) {
    if (e.response) {
      const err = new Error("PBX API Error");
      err.response = e.response;
      throw err;
    }
    throw e;
  }
}

/* ================= GET NETWORK CONFIG ================= */
router.get("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  try {
    // Locate the PBX node associated with this property
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Call the Laravel API
    const response = await pbxRequest(node, "get", `/api/network`);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE NETWORK CONFIG ================= */
router.put("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Call the Laravel API
    const response = await pbxRequest(node, "put", `/api/network`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;