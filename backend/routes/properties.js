const express = require("express");
const axios = require("axios");
const db = require("../db");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ================= LIST PROPERTIES ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, base_url, enabled FROM pbx_nodes ORDER BY id DESC"
    );

    res.json({
      data: rows,
    });
  } catch (e) {
    res.status(500).json({
      message: "Failed to load properties",
      error: e.message,
    });
  }
});

/* ================= ADD PROPERTY ================= */
router.post("/", async (req, res) => {
  const { name, base_url, api_token } = req.body;

  if (!name || !base_url || !api_token) {
    return res.status(422).json({ message: "Missing fields" });
  }

  try {
    await db.query(
      "INSERT INTO pbx_nodes (name, base_url, api_token, enabled) VALUES (?, ?, ?, 1)",
      [name, base_url, api_token]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      message: "Failed to add property",
      error: e.message,
    });
  }
});

/* ================= TOGGLE ENABLE ================= */
router.patch("/:id/toggle", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "UPDATE pbx_nodes SET enabled = IF(enabled = 1, 0, 1) WHERE id = ?",
      [id]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      message: "Failed to toggle property",
      error: e.message,
    });
  }
});

/* ================= TEST PROPERTY ================= */
router.post("/:id/test", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT base_url, api_token FROM pbx_nodes WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Property not found" });
    }

    const node = rows[0];

    const test = await axios.get(
      `${node.base_url.replace(/\/$/, "")}/api/tenants`,
      {
        headers: { Authorization: `Bearer ${node.api_token}` },
        timeout: 8000,
      }
    );

    res.json({
      ok: true,
      tenants: test.data,
    });
  } catch (e) {
    res.status(500).json({
      message: "PBX connection failed",
      error: e.message,
    });
  }
});

/* ================= TENANTS PER PROPERTY (Renamed) ================= */
// Renamed from "/:propertyId/tenants" to "/:propertyId/pbx-tenants" 
// to avoid conflict with the main tenants.js routes
router.get("/:propertyId/pbx-tenants", async (req, res) => {
  const { propertyId } = req.params;
  const nodes = await getPbxNodes();

  const node = nodes.find(
    (n) => String(n.id) === String(propertyId)
  );

  if (!node) {
    return res.status(404).json({
      message: "Property not found",
    });
  }

  try {
    const response = await axios.get(
      `${node.baseUrl.replace(/\/$/, "")}/api/tenants`,
      {
        headers: { Authorization: `Bearer ${node.token}` },
        timeout: 15000,
      }
    );

    return res.json({
      property_id: node.id,
      property: node.name,
      tenants: response.data?.data || [],
    });
  } catch (e) {
    return res.status(500).json({
      message: "Failed to fetch tenants",
      error: e.message,
    });
  }
});

module.exports = router;