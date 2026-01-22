const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();
const upload = multer();

/* ================= HELPER ================= */
async function pbxRequest(node, method, endpoint, data = null, headers = {}) {
  const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
  const options = {
    method,
    url,
    data,
    headers: { Authorization: `Bearer ${node.token}`, ...headers },
    timeout: 30000,
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

/* ================= LIST ================= */
router.get("/property/:propertyId/tenant/:tenantId", async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const response = await pbxRequest(node, "get", `/api/tenants/${tenantId}/voice-prompts`);
    // Extract prompts array based on your API structure
    const list = response.prompts || response.data || []; 
    res.json({ ok: true, data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPLOAD (CREATE) ================= */
router.post("/property/:propertyId/tenant/:tenantId", upload.single("file"), async (req, res) => {
  const { propertyId, tenantId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    const form = new FormData();
    form.append("name", req.body.name);
    if (req.body.description) form.append("description", req.body.description);
    if (req.file) form.append("file", req.file.buffer, req.file.originalname);

    const response = await pbxRequest(
      node, 
      "post", 
      `/api/tenants/${tenantId}/voice-prompts`, 
      form, 
      form.getHeaders()
    );
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= UPDATE (FIXED: Supports Files) ================= */
router.put("/property/:propertyId/tenant/:tenantId/prompt/:promptId", upload.single("file"), async (req, res) => {
  const { propertyId, tenantId, promptId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    // ✅ FIX: Use FormData with _method: PUT
    const form = new FormData();
    form.append("_method", "PUT"); // Laravel Trick
    form.append("name", req.body.name);
    if (req.body.description) form.append("description", req.body.description);
    
    // Append file only if uploaded
    if (req.file) {
      form.append("file", req.file.buffer, req.file.originalname);
    }

    // ✅ FIX: Send as POST to PBX (Laravel needs POST for file updates)
    const response = await pbxRequest(
      node, 
      "post", 
      `/api/tenants/${tenantId}/voice-prompts/${promptId}`, 
      form,
      form.getHeaders()
    );
    res.json(response);
  } catch (e) {
    if (e.response) return res.status(e.response.status).json(e.response.data);
    res.status(500).json({ error: e.message });
  }
});

/* ================= DELETE ================= */
router.delete("/property/:propertyId/tenant/:tenantId/prompt/:promptId", async (req, res) => {
  const { propertyId, tenantId, promptId } = req.params;
  try {
    const nodes = await getPbxNodes();
    const node = nodes.find((n) => String(n.id) === String(propertyId));
    if (!node) return res.status(404).json({ error: "PBX Node not found" });

    await pbxRequest(node, "delete", `/api/tenants/${tenantId}/voice-prompts/${promptId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;