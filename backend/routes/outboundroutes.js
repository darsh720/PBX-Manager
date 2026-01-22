const express = require("express");
const axios = require("axios");
const { getPbxNodes } = require("../lib/pbx");

const router = express.Router();

/* ================= HELPERS ================= */
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

async function getTenantById(node, propertyId) {
    try {
        const tenantsRes = await pbxRequest(node, "get", "/api/tenants");
        const tenantsData = tenantsRes.data || [];

        // Flatten all tenants for this PBX
        const allTenants = tenantsData.reduce((acc, pbxItem) => {
            if (pbxItem.tenants) acc.push(...pbxItem.tenants);
            return acc;
        }, []);

        const tenant = allTenants.find(t => t.id === Number(propertyId));
        return tenant || null;
    } catch (e) {
        return null;
    }
}

/* =====================================================
   GET: Outbound Routes (PROPERTY / SINGLE PBX)
===================================================== */
router.get("/property/:propertyId", async (req, res) => {
    try {
        const pbxId = Number(req.params.propertyId);
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === pbxId);

        if (!node) {
            return res.status(404).json({ error: "PBX not found" });
        }

        const response = await pbxRequest(node, "get", "/api/outbound-routes");

        res.json({
            pbx_id: node.id,
            pbx: node.name,
            ok: true,
            routes: response.data || [],
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

/* =====================================================
   GET: Outbound Routes (ALL PBXs)
===================================================== */
router.get("/", async (req, res) => {
    try {
        const nodes = await getPbxNodes();
        const results = [];

        for (const node of nodes) {
            try {
                const response = await pbxRequest(node, "get", "/api/outbound-routes");
                results.push({
                    pbx_id: node.id,
                    pbx: node.name,
                    ok: true,
                    routes: response.data || [],
                });
            } catch (e) {
                results.push({
                    pbx_id: node.id,
                    pbx: node.name,
                    ok: false,
                    routes: [],
                    error: e.message,
                });
            }
        }

        res.json({ ok: true, results });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

/* =====================================================
   GET: SINGLE OUTBOUND ROUTE (WITH PROPERTY DETAILS)
===================================================== */
router.get("/property/:propertyId/route/:routeId", async (req, res) => {
    try {
        const { propertyId, routeId } = req.params;

        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === Number(propertyId));

        if (!node) {
            return res.status(404).json({ error: "Property not found" });
        }

        // 🔴 THIS MUST CALL PBX SINGLE-ROUTE API
        const response = await pbxRequest(
            node,
            "get",
            `/api/outbound-routes/${routeId}`
        );

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* =====================================================
   GET: TENANTS
===================================================== */
router.get("/property/:propertyId/tenants", async (req, res) => {
    try {
        const pbxId = Number(req.params.propertyId);
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === pbxId);

        if (!node) return res.status(404).json({ error: "PBX not found" });

        const response = await pbxRequest(node, "get", "/api/tenants");
        let rawList = [];

        if (response.data && response.data.data && Array.isArray(response.data.data)) {
            rawList = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
            rawList = response.data;
        } else if (Array.isArray(response)) {
            rawList = response;
        }
        const finalTenants = rawList.reduce((acc, item) => {
            if (item.tenants && Array.isArray(item.tenants)) {
                acc.push(...item.tenants);
            } else {
                acc.push(item);
            }
            return acc;
        }, []);

        res.json({ ok: true, tenants: finalTenants });
    } catch (e) {
        console.error("Error fetching tenants:", e);
        res.status(500).json({ ok: false, error: e.message, tenants: [] });
    }
});


/* =====================================================
   GET: TRUNKS
===================================================== */
router.get("/property/:propertyId/trunks", async (req, res) => {
    try {
        const pbxId = Number(req.params.propertyId);
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === pbxId);

        if (!node) return res.status(404).json({ error: "PBX not found" });

        const response = await pbxRequest(node, "get", "/api/trunks");
        res.json({ ok: true, trunks: response.data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* =====================================================
   POST: CREATE
===================================================== */
router.post("/property/:propertyId", async (req, res) => {
    try {
        const pbxId = Number(req.params.propertyId);
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === pbxId);

        if (!node) return res.status(404).json({ error: "PBX not found" });

        const endpoint = "/api/outbound-routes";
        const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
        const response = await pbxRequest(node, "post", endpoint, req.body);

        res.json(response);

    } catch (e) {
        console.error(`\n[CREATE ROUTE] FAILED ---------------------------------`);
        
        if (e.response) {
            return res.status(e.response.status).json(e.response.data);
        } 
        
        res.status(500).json({ error: e.message });
    }
});

/* =====================================================
   PUT: UPDATE
===================================================== */
router.put("/property/:propertyId/route/:routeId", async (req, res) => {
    try {
        const { propertyId, routeId } = req.params;
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === Number(propertyId));

        if (!node) return res.status(404).json({ error: "PBX not found" });

        const endpoint = `/api/outbound-routes/${routeId}`;
        const fullUrl = `${node.baseUrl.replace(/\/$/, "")}${endpoint}`;
        const response = await pbxRequest(node, "put", endpoint, req.body);

        res.json(response);

    } catch (e) {

        // 1. Check if it's a response from Laravel (e.g. 422 Validation Error)
        if (e.response) {
            // Send the actual Laravel error back to the frontend
            return res.status(e.response.status).json(e.response.data);
        }
        res.status(500).json({ error: e.message });
    }
});

/* =====================================================
   DELETE
===================================================== */
router.delete("/property/:propertyId/route/:routeId", async (req, res) => {
    try {
        const { propertyId, routeId } = req.params;
        const nodes = await getPbxNodes();
        const node = nodes.find(n => n.id === Number(propertyId));

        if (!node) return res.status(404).json({ error: "PBX not found" });

        await pbxRequest(node, "delete", `/api/outbound-routes/${routeId}`);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
