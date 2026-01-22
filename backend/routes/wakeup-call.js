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

/* ================= GET WAKEUP DATA (Settings + Schedule) ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/wakeup`);
    res.json(response); // Returns { ok: true, settings: {...}, guest_wakeups: [...] }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE SETTINGS (Create/Edit) ================= */
router.put("/property/:propertyId/tenant/:tenantId/settings", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "put", `/api/tenants/${tenantId}/wakeup`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= SCHEDULE CALL ================= */
router.post("/property/:propertyId/tenant/:tenantId/schedule", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "post", `/api/tenants/${tenantId}/wakeup/schedule`, req.body);
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= DELETE SCHEDULE (Cancel) ================= */
router.delete("/property/:propertyId/tenant/:tenantId/schedule/:extension", async (req, res) => {
  const { propertyId, tenantId, extension } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // Using POST or DELETE depending on API spec. Laravel typically uses DELETE for 'destroy' actions.
    // The route provided was: Route::delete('/tenants/{tenant}/wakeup/{extension}', ...)
    await pbxRequest(node, "delete", `/api/tenants/${tenantId}/wakeup/${extension}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;