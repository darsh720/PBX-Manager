const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

async function pbxRequest(node, method, endpoint, data = null) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios({
    method,
    url,
    data,
    headers: {
      Authorization: `Bearer ${node.token}`,
    },
    timeout: 15000,
  });
  return res.data;
}

/* ===========================
   GET: All DIDs (All PBXs)
=========================== */
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const response = await pbxRequest(node, "get", "/api/dids");

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        dids: response.data || [],
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

/* ===========================
   GET: DIDs by Property
=========================== */
router.get("/property/:propertyId", async (req, res) => {
  try {
    const pbxId = Number(req.params.propertyId);
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxRequest(node, "get", "/api/dids");

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      dids: response.data || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================
   GET: Single DID
=========================== */
router.get("/property/:propertyId/did/:didId", async (req, res) => {
  try {
    const { propertyId, didId } = req.params;
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    if (!node) return res.status(404).json({ error: "Property not found" });

    const response = await pbxRequest(node, "get", `/api/dids/${didId}`);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================
   GET: All Tenants for Property
=========================== */
router.get("/property/:propertyId/tenants", async (req, res) => {
  try {
    const pbxId = Number(req.params.propertyId);
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const response = await pbxRequest(node, "get", "/api/tenants");

    res.json({
      ok: true,
      tenants: response.data || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===========================
   POST: Create DID
=========================== */
router.post("/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;

    // FIX: Destructure all necessary fields from req.body
    const {
      did_number,
      status,
      property_id, // Tenant ID
      did_name,
      description,
      max_simultaneous_calls
    } = req.body;

    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    // LOG 2: Check Node Selection
    if (node) {
    } else {
      return res.status(404).json({ error: "Property not found" });
    }

    // ✅ CORRECT PAYLOAD FOR PBX
    const payload = {
      did_number,
      did_name,
      description,
      max_simultaneous_calls,
      status,
      property_id: Number(property_id),
    };

    const response = await pbxRequest(node, "post", "/api/dids", payload);

    res.json(response);
  } catch (e) {
    // LOG 5: Catch Errors
    console.error("❌ ERROR in Create DID:", e.message);
    if (e.response) {
      console.error("   PBX Error Details:", e.response.data);
    }

    res.status(500).json({ error: e.message });
  }
});

/* ===========================
   PUT: Update DID
=========================== */
router.put("/property/:propertyId/did/:didId", async (req, res) => {
  try {
    const { propertyId, didId } = req.params;

    // ✅ FIX: Extract ALL fields from req.body
    const {
      did_number,
      did_name,
      description,
      max_simultaneous_calls,
      status,
      property_id
    } = req.body;

    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    if (!node) {
      return res.status(404).json({ error: "Property not found" });
    }

    const payload = {
      did_number,
      did_name,
      description,
      max_simultaneous_calls,
      status,
      property_id: Number(property_id),
    };

    const response = await pbxRequest(
      node,
      "put",
      `/api/dids/${didId}`,
      payload
    );

    res.json(response);
  } catch (e) {
    console.error("Update DID Error:", e); // Log error for debugging
    res.status(500).json({ error: e.message });
  }
});

/* ===========================
   DELETE: DID
=========================== */
router.delete("/property/:propertyId/did/:didId", async (req, res) => {
  try {
    const { propertyId, didId } = req.params;
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => n.id === Number(propertyId));

    if (!node) return res.status(404).json({ error: "Property not found" });

    await pbxRequest(node, "delete", `/api/dids/${didId}`);
    res.json({ ok: true, message: "DID deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
