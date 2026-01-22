const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

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

/* ================= GET TENANT GRAPHS ================= */
router.get("/property/:propertyId/tenant/:tenantId/graphs", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  const { date } = req.query; // Accept date query param

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Proxy to: /api/tenants/{tenant}/graphs?date=YYYY-MM-DD
    const endpoint = `/api/tenants/${tenantId}/graphs${date ? `?date=${date}` : ''}`;
    const response = await pbxRequest(node, "get", endpoint);
    
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;