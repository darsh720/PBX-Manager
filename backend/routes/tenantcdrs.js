const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

async function pbxRequest(node, method, endpoint, params = {}, data = null) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const options = {
    method,
    url,
    params,
    data,
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 60000,
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

router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  const queryParams = req.query;

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // API returns: { success: true, data: { current_page: 1, data: [...] }, date: "..." }
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/cdrs`, queryParams);
    
    // Extract the pagination object correctly
    let paginationData = {
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0
    };

    // Case 1: Standard Laravel Pagination inside response.data
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
        paginationData = response.data;
    } 
    // Case 2: Direct Array inside response.data
    else if (response.data && Array.isArray(response.data)) {
        paginationData.data = response.data;
        paginationData.total = response.data.length;
    }

    res.json({ 
        ok: true, 
        data: paginationData,
        date_used: response.date // Pass back the date the backend actually used
    });

  } catch (e) {
    console.error("Tenant CDR Error:", e.message);
    res.status(500).json({ error: e.message, ok: false });
  }
});

router.delete("/property/:propertyId/tenant/:tenantId/record/:cdrId", async (req, res) => {
  const { propertyId, tenantId, cdrId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    await pbxRequest(node, "delete", `/api/tenants/${tenantId}/cdrs/${cdrId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;