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

/* ================= LIST BOXES ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // API: /api/tenants/{tenant}/voicemail-boxes
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/voicemail-boxes`);
    
    // Normalize response: API returns { boxes: [...] } or { data: [...] }
    let list = [];
    if (response.boxes && Array.isArray(response.boxes)) {
        list = response.boxes;
    } else if (response.data && Array.isArray(response.data.data)) {
        list = response.data.data;
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

/* ================= CREATE BOX ================= */
router.post("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/voicemail-boxes`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE BOX ================= */
router.put("/property/:propertyId/tenant/:tenantId/box/:boxId", async (req, res) => {
  const { propertyId, tenantId, boxId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "put", `/api/tenants/${tenantId}/voicemail-boxes/${boxId}`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= DELETE BOX ================= */
router.delete("/property/:propertyId/tenant/:tenantId/box/:boxId", async (req, res) => {
  const { propertyId, tenantId, boxId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    await pbxRequest(node, "delete", `/api/tenants/${tenantId}/voicemail-boxes/${boxId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;