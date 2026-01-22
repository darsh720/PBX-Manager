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
    timeout: 10000,
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

/* ================= GET TENANT FEATURES ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/features`);
    
    // Extract List
    let list = [];
    if (response.features && Array.isArray(response.features)) {
        list = response.features;
    } else if (response.data && Array.isArray(response.data)) {
        list = response.data; 
    } else if (Array.isArray(response)) {
        list = response;
    }
    
    // ⚠️ REMOVED THE FILTER: Now sending ALL features, regardless of 'available' status
    // list = list.filter(f => f.available === true); <--- REMOVED THIS

    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;