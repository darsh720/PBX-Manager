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

/* ================= LIST DIDs (FIXED) ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/dids`);
    
    // ✅ FIX: Extract from 'dids.data' based on your JSON
    let list = [];
    if (response.dids && Array.isArray(response.dids.data)) {
        list = response.dids.data;
    } else if (response.data && Array.isArray(response.data)) {
        list = response.data;
    } else if (Array.isArray(response)) {
        list = response;
    }
    
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE DID (ASSIGN) ================= */
router.put("/property/:propertyId/tenant/:tenantId/did/:didId", async (req, res) => {
  const { propertyId, tenantId, didId } = req.params;

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Pass the body exactly as received
    const response = await pbxRequest(node, "put", `/api/tenants/${tenantId}/dids/${didId}`, req.body);
    
    res.json(response);
  } catch (e) {
    console.error("PBX Update Error:", e.response?.data || e.message); // Debug Log
    
    if (e.response) {
        return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ error: e.message });
  }
});

/* ================= HELPER FOR LISTS ================= */
async function fetchTenantList(req, res, endpoint) {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Fetch list with high limit
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/${endpoint}?per_page=1000`);
    
    let list = [];
    if (response.data && Array.isArray(response.data)) list = response.data;
    else if (Array.isArray(response)) list = response;
    
    res.json({ ok: true, data: list });
  } catch (e) {
    console.error(`Fetch ${endpoint} Error:`, e.message);
    res.status(500).json({ error: e.message });
  }
}

/* ================= NEW ROUTES ================= */
router.get("/extensions/property/:propertyId/tenant/:tenantId", (req, res) => fetchTenantList(req, res, "extensions"));
router.get("/ring-groups/property/:propertyId/tenant/:tenantId", (req, res) => fetchTenantList(req, res, "ring-groups"));
router.get("/ivrs/property/:propertyId/tenant/:tenantId", (req, res) => fetchTenantList(req, res, "ivrs"));
router.get("/voicemail-boxes/property/:propertyId/tenant/:tenantId", (req, res) => fetchTenantList(req, res, "voicemail-boxes"));
router.get("/fax/property/:propertyId/tenant/:tenantId", (req, res) => fetchTenantList(req, res, "faxes"));

module.exports = router;