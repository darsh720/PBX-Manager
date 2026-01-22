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

/* ================= GET PMS STATUS (Rooms & Config) ================= */
router.get("/property/:propertyId/tenant/:tenantId/status", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/pms/status`);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= GET PMS CONSOLE LOGS ================= */
router.get("/property/:propertyId/tenant/:tenantId/console", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/pms/console`);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= SAVE CONFIGURATION ================= */
router.post("/property/:propertyId/tenant/:tenantId/config", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/pms/config`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= EXPORT (CSV & PDF) - FIXED ================= */
router.get("/property/:propertyId/tenant/:tenantId/export/:type", async (req, res) => {
  const { propertyId, tenantId, type } = req.params;
  
  // 1. Validate export type to prevent errors
  if (!['csv', 'pdf'].includes(type)) {
      return res.status(400).send("Invalid export type. Must be 'csv' or 'pdf'.");
  }

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).send("PBX Node not found");
    
    // 2. Construct dynamic URL based on type
    const url = `${node.baseUrl.replace(/\/$/, "")}/api/tenants/${tenantId}/pms/status/export/${type}`;
    
    // 3. Stream the file back to the client
    const response = await axios({
        method: 'GET',
        url: url,
        headers: { Authorization: `Bearer ${node.token}` },
        responseType: 'stream' // Important for binary files (PDF)
    });

    // 4. Set appropriate headers
    const contentType = type === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=pms-status.${type}`);
    
    response.data.pipe(res);
  } catch (e) {
    console.error(`Export ${type} failed:`, e.message);
    res.status(500).send("Export failed");
  }
});

module.exports = router;