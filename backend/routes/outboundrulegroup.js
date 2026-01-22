const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ================= HELPERS ================= */
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
    // Attach response to error for the route handler to use
    if (e.response) {
      const err = new Error("PBX API Error");
      err.response = e.response;
      throw err;
    }
    throw e;
  }
}

/* =====================================================
   GET: ALL RULE GROUPS (All Nodes)
===================================================== */
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxRequest(node, "get", "/api/outbound-rule-groups");
      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        ruleGroups: response.data || [],
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

/* =====================================================
   GET: RULE GROUPS (Specific Property)
===================================================== */
router.get("/property/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const pbxId = parseInt(propertyId);

  if (isNaN(pbxId)) return res.status(400).json({ error: "Invalid property ID" });

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);
    if (!node) return res.status(404).json({ error: "Property not found" });

    const response = await pbxRequest(node, "get", "/api/outbound-rule-groups");

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      ruleGroups: response.data || [],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =====================================================
   GET: SINGLE RULE GROUP (For Edit)
===================================================== */
router.get("/property/:propertyId/group/:groupId", async (req, res) => {
  const { propertyId, groupId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));
    if (!node) return res.status(404).json({ error: "PBX not found" });

    const endpoint = `/api/outbound-rule-groups/${groupId}`;
    const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;

    const response = await pbxRequest(node, "get", endpoint);

    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =====================================================
   POST: CREATE (With Logging)
===================================================== */
router.post("/property/:propertyId", async (req, res) => {
  try {
    const pbxId = Number(req.params.propertyId);
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) return res.status(404).json({ error: "PBX not found" });

    const endpoint = "/api/outbound-rule-groups";
    const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;

    const response = await pbxRequest(node, "post", endpoint, req.body);

    res.json(response);
  } catch (e) {
    console.error(`\n[CREATE GROUP] FAILED ---------------------------------`);
    if (e.response) {

      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ error: e.message });
  }
});

/* =====================================================
   PUT: UPDATE (With Logging)
===================================================== */
router.put("/property/:propertyId/group/:groupId", async (req, res) => {
  try {
    const { propertyId, groupId } = req.params;
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    if (!node) return res.status(404).json({ error: "PBX not found" });

    const endpoint = `/api/outbound-rule-groups/${groupId}`;
    const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;

    const response = await pbxRequest(node, "put", endpoint, req.body);

    res.json(response);
  } catch (e) {

    if (e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ error: e.message });
  }
});

/* =====================================================
   DELETE
===================================================== */
router.delete("/property/:propertyId/group/:groupId", async (req, res) => {
  try {
    const { propertyId, groupId } = req.params;
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    if (!node) return res.status(404).json({ error: "PBX not found" });

    await pbxRequest(node, "delete", `/api/outbound-rule-groups/${groupId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;