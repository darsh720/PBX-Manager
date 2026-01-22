const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

async function pbxRequest(node, method, endpoint) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await axios({
    method,
    url,
    headers: { Authorization: `Bearer ${node.token}` },
    timeout: 15000,
  });
  return res.data;
}

/* =========================================================
   GET TENANT REALTIME (PROPERTY-SCOPED)
========================================================= */
router.get("/:propertyId/tenant/:tenantId/realtime", async (req, res) => {

  const { propertyId, tenantId } = req.params;
  const pbxId = Number(propertyId);

  try {
    const nodes = await getPbxNodes();
    const node = nodes.find(n => n.id === pbxId);

    if (!node) {
      return res.status(404).json({ error: "PBX Node not found" });
    }

    const endpoint = `/api/tenants/${tenantId}/tenant-realtime`;
    const response = await pbxRequest(node, "get", endpoint);

    res.json({
      ok: true,
      pbx_id: node.id,
      tenant_id: tenantId,
      data: response,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
