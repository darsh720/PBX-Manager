const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ================= HELPER FUNCTION ================= */
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

/* =========================================================
   GET /api/tenants
   List tenants from ALL PBX nodes (Used by PropertySelector)
   ✅ THIS WAS MISSING
========================================================= */
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxRequest(node, "get", "/api/tenants");

      // Extract array safely
      let list = [];
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        list = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        list = response.data;
      } else if (Array.isArray(response)) {
        list = response;
      }

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        data: list, // PropertySelector expects this structure
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
   GET /api/tenants/property/:propertyId
   List all tenants for ONE property
========================================================= */
router.get("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", "/api/tenants");

    // Extract array safely
    let tenantList = [];
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      tenantList = response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      tenantList = response.data;
    } else if (Array.isArray(response)) {
      tenantList = response;
    }

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      tenants: tenantList,
    });
  } catch (e) {
    console.error(`[GET TENANTS] Error: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================================================
   CREATE
========================================================= */
router.post("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", "/api/tenants", req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* =========================================================
   UPDATE
========================================================= */
router.put("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  const pbxId = Number(propertyId);
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "put", `/api/tenants/${tenantId}`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* =========================================================
   DELETE
========================================================= */
router.delete("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  const pbxId = Number(propertyId);
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    await pbxRequest(node, "delete", `/api/tenants/${tenantId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================================================
   GET SUMMARY
========================================================= */
router.get("/property/:propertyId/tenant/:tenantId/summary", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  const pbxId = Number(propertyId);

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const endpoint = `/api/tenants/${tenantId}/summary`;
    const response = await pbxRequest(node, "get", endpoint);

    res.json({ ok: true, data: response });
  } catch (e) {
    console.error(`[GET SUMMARY] Failed: ${e.message}`);
    if (e.response && e.response.status === 404) {
      return res.status(404).json({ error: "Tenant summary not found on PBX" });
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;