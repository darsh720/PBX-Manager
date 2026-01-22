const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ================= HELPER ================= */

function pbxUrl(node, path) {
  return `${node.baseUrl.replace(/\/$/, "")}${path}`;
}

/* ======================================================
   GET /api/global-prompts
====================================================== */
router.get("/", async (req, res) => {
  const nodes = await getPbxNodes();
  const results = [];

  for (const node of nodes) {
    try {
      const r = await axios.get(pbxUrl(node, "/api/globalprompts"), {
        headers: { Authorization: `Bearer ${node.token}` },
        timeout: 15000,
      });

      results.push({
        pbx_id: node.id,
        pbx: node.name,
        ok: true,
        data: r.data,
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

/* ======================================================
   GET /api/global-prompts/property/:propertyId
====================================================== */
router.get("/property/:propertyId", async (req, res) => {
  const pbxId = Number(req.params.propertyId);
  const nodes = await getPbxNodes();
  const node = nodes.find((n) => n.id === pbxId);

  if (!node) {
    return res.status(404).json({ ok: false, error: "Property not found" });
  }

  try {
    const r = await axios.get(pbxUrl(node, "/api/globalprompts"), {
      headers: { Authorization: `Bearer ${node.token}` },
      timeout: 15000,
    });

    res.json({
      pbx_id: node.id,
      pbx: node.name,
      ok: true,
      data: r.data,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ======================================================
   POST /api/global-prompts
   (UPLOAD NEW PROMPT)
====================================================== */
router.post("/", upload.single("file"), async (req, res) => {
  const { name } = req.body;
  const file = req.file;

  if (!name || !file) {
    return res.status(400).json({ ok: false, error: "name and WAV file required" });
  }

  const nodes = await getPbxNodes();
  const master = nodes[0];

  try {
    const form = new FormData();
    form.append("name", name);
    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // Calculate Length for Stability
    const formLength = await new Promise((resolve, reject) => {
      form.getLength((err, len) => {
        if (err) reject(err);
        else resolve(len);
      });
    });

    const r = await axios.post(pbxUrl(master, "/api/globalprompts"), form, {
      headers: {
        Authorization: `Bearer ${master.token}`,
        ...form.getHeaders(),
        "Content-Length": formLength, // Vital for PHP/Nginx stability
      },
      timeout: 60000,
      maxBodyLength: Infinity,
    });

    res.status(201).json({ ok: true, data: r.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ======================================================
   POST /api/global-prompts/:id
   (UPDATE PROMPT - Uses POST with _method=PUT)
====================================================== */
router.post("/:id", upload.single("file"), async (req, res) => {
  const promptId = Number(req.params.id);
  const { name } = req.body;
  const file = req.file;

  const nodes = await getPbxNodes();
  const master = nodes[0];

  try {
    const form = new FormData();
    // 1. Spoof PUT for Laravel (Required because PHP cannot parse multipart PUT requests)
    form.append("_method", "PUT");

    if (name) form.append("name", name);
    if (file) {
      form.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    // 2. FIX: Manually calculate Content-Length
    // Node.js streams often don't set this automatically, causing PHP/Nginx to drop the connection (ECONNRESET)
    const formLength = await new Promise((resolve, reject) => {
      form.getLength((err, length) => {
        if (err) reject(err);
        else resolve(length);
      });
    });

    const targetUrl = pbxUrl(master, `/api/globalprompts/${promptId}`);
    const response = await axios.post(targetUrl, form, {
      headers: {
        Authorization: `Bearer ${master.token}`,
        ...form.getHeaders(),
        "Content-Length": formLength, // <--- THIS IS THE FIX
      },
      maxBodyLength: Infinity,
      timeout: 60000, // 60s timeout
    });

    res.json({ ok: true, data: response.data });
  } catch (e) {
    if (e.response) {
    } else {
    }
    const msg = e.response?.data?.message || e.message;
    res.status(500).json({ ok: false, error: msg });
  }
});

/* ======================================================
   DELETE /api/global-prompts/:id
====================================================== */
router.delete("/:id", async (req, res) => {
  const promptId = Number(req.params.id);
  const nodes = await getPbxNodes();
  const master = nodes[0];

  try {
    await axios.delete(pbxUrl(master, `/api/globalprompts/${promptId}`), {
      headers: { Authorization: `Bearer ${master.token}` },
      timeout: 15000,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;