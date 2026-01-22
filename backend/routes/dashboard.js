const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ======================================================
   Helper: GET from PBX node
====================================================== */
async function pbxGet(node, endpoint) {
    const url = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${node.token}` },
        timeout: 15000,
    });
    return res.data;
}

/* ======================================================
   GET DASHBOARD SUMMARY (ALL PBX)
   GET /api/dashboard/summary
====================================================== */
router.get("/summary", async (req, res) => {
    const nodes = await getPbxNodes();
    const date =
        req.query.date || new Date().toISOString().split("T")[0];

    const results = [];

    for (const node of nodes) {
        try {
            const response = await pbxGet(
                node,
                `/api/dashboard/summary?date=${date}` // ✅ forward date
            );

            results.push({
                pbx_id: node.id,
                pbx: node.name,
                ok: true,
                data: response,
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
   GET DASHBOARD SUMMARY (SINGLE PBX)
   GET /api/dashboard/property/:propertyId
====================================================== */
router.get("/property/:propertyId", async (req, res) => {
    const pbxId = parseInt(req.params.propertyId);

    if (isNaN(pbxId)) {
        return res.status(400).json({ error: "Invalid property ID" });
    }

    try {
        const nodes = await getPbxNodes();
        const node = nodes.find((n) => n.id === pbxId);

        if (!node) {
            return res.status(404).json({ error: "Property not found" });
        }

        const response = await pbxGet(node, "/api/dashboard/summary");

        res.json({
            pbx_id: node.id,
            pbx: node.name,
            ok: true,
            data: response,
        });
    } catch (e) {
        res.status(500).json({
            ok: false,
            error: e.message,
        });
    }
});

/* ======================================================
   GET CALL CHART (DATE WISE)
   GET /api/dashboard/call-chart?date=YYYY-MM-DD
====================================================== */
router.get("/call-chart", async (req, res) => {
    const nodes = await getPbxNodes();
    const date =
        req.query.date || new Date().toISOString().split("T")[0];

    const results = [];

    for (const node of nodes) {
        try {
            const url = `${node.baseUrl.replace(/\/$/, "")}/api/dashboard/call-chart?date=${date}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${node.token}`,
                },
                timeout: 15000,
            });

            results.push({
                pbx_id: node.id,
                pbx: node.name,
                ok: true,
                data: response.data, // ← EXACT Laravel response
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

module.exports = router;
