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

/* ================= LIST EXTENSIONS (FIXED) ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/extensions?per_page=1000`);
    
    // ✅ FIX: Handle Laravel Pagination Structure
    // API returns: { ok: true, data: { data: [...] } }
    let list = [];
    if (response.data && Array.isArray(response.data.data)) {
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

/* ================= CREATE EXTENSION ================= */
router.post("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/extensions`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE EXTENSION ================= */
router.put("/property/:propertyId/tenant/:tenantId/extension/:extId", async (req, res) => {
  const { propertyId, tenantId, extId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "put", `/api/tenants/${tenantId}/extensions/${extId}`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= DELETE EXTENSION ================= */
router.delete("/property/:propertyId/tenant/:tenantId/extension/:extId", async (req, res) => {
  const { propertyId, tenantId, extId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    await pbxRequest(node, "delete", `/api/tenants/${tenantId}/extensions/${extId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= BULK ACTION ================= */
router.post("/property/:propertyId/tenant/:tenantId/bulk", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/extensions/bulk`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= GET SINGLE EXTENSION ================= */
router.get("/property/:propertyId/tenant/:tenantId/extension/:extId", async (req, res) => {
  const { propertyId, tenantId, extId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Call PBX
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/extensions/${extId}`);
    
    // ❌ OLD BROKEN LINE (This was deleting stats & live status)
    // const data = response.data || response; 
    // res.json(data);

    // ✅ NEW FIXED LINE (Pass the full object: data, stats, extension, speed_dials)
    res.json(response); 

  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= SAVE FORWARDING RULE ================= */
router.post("/property/:propertyId/tenant/:tenantId/extension/:extId/forward", async (req, res) => {
  const { propertyId, tenantId, extId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) {
        console.error("[API] Error: PBX Node not found");
        return res.status(404).json({ error: "PBX Node not found" });
    }
    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/extensions/${extId}/forward`, req.body);
    res.json(response);

  } catch (e) {
    console.error("[API] Failed:", e.message);
    if (e.response) {
        console.error("[API] PBX Error Data:", e.response.data);
        return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ error: e.message });
  }
});

/* ================= GET FORWARDING RULES ================= */
router.get("/property/:propertyId/tenant/:tenantId/extension/:extId/forward", async (req, res) => {
  const { propertyId, tenantId, extId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Proxy to Laravel GET endpoint
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/extensions/${extId}/forward`);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= GET TENANT INFO (For Default Rule Group) ================= */
router.get("/property/:propertyId/tenant/:tenantId/info", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Call PBX to get specific tenant details
    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}`);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;