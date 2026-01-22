require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const axios = require("axios");
const { Server } = require("socket.io");

/* ===== ROUTES ===== */
const tenantsRoute = require("./routes/tenants");
const propertiesRoute = require("./routes/properties");
const trunksRoute = require("./routes/trunks");
const packagesRoute = require("./routes/package");
const outboundrulegroupsRoute = require("./routes/outboundrulegroup");
const didsRoute = require("./routes/dids");
const outboundRoutesRoute = require("./routes/outboundroutes");
const accountRoutes = require("./routes/account");
const callchartRoutes = require("./routes/dashboard");
const systemRoutes = require("./routes/system");
const activecallRoutes = require("./routes/activecalls");
const realtimedashRoutes = require("./routes/realtimedashboard");
const realtimegateRoutes = require("./routes/realtimegateway");
const golbalpromptsRoutes = require("./routes/globalprompts");
const cdrsRoutes = require("./routes/cdrs");
const tokensRoutes = require("./routes/api-token");
const tenantRealtimeRoute = require("./routes/tenantRealtime");
const tenantRegistration = require("./routes/tenantRegistration");
const tenatVoiceprompts = require("./routes/voice-prompts")
const tenantExtensionGroup = require("./routes/extension-groups");
const tenantExtensions = require("./routes/extensions");
const tenantDids = require("./routes/tenantdids");
const tenantCdrs = require("./routes/tenantcdrs");
const tenantFeatures = require("./routes/features");
const tenantE911Addresses = require("./routes/e911-addresses");
const tenantE911Endpoints = require("./routes/e911-endpoints");
const tenantRingGroups =  require("./routes/ring-groups");
const tenantIvrs = require("./routes/ivrs");
const tenantAiagents = require("./routes/ai-agents");
const tenantWakeupcalls = require("./routes/wakeup-call");
const tenantVoicemails = require("./routes/voicemail");
const tenantVoicemailbox = require("./routes/voicemail-boxes");
const tenantSpeeddials = require("./routes/speed-dials");
const tenantPms = require("./routes/pms");
const tenantFax = require("./routes/fax");
const tenantSummary = require("./routes/summary");
const tenantSummaryGraph = require("./routes/graphs");
const networkconfig = require("./routes/network");

/* ===== DB / PBX LOADER ===== */
const { getPbxNodes } = require("./lib/pbx");

/* ===== APP SETUP ===== */
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* ===== HTTP + SOCKET ===== */
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

/* ===== API ROUTES ===== */
app.use("/api/tenants", tenantsRoute);
app.use("/api/properties", propertiesRoute);
app.use("/api/packages", packagesRoute);
app.use("/api/trunks", trunksRoute);
app.use("/api/outbound-rule-groups", outboundrulegroupsRoute);
app.use("/api/dids", didsRoute);
app.use("/api/outbound-routes", outboundRoutesRoute);
app.use("/api/dashboard/summary", accountRoutes);
app.use("/api/dashboard", callchartRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/active-calls", activecallRoutes);
app.use("/api/realtime-dashboard", realtimedashRoutes);
app.use("/api/realtime-gateways", realtimegateRoutes);
app.use("/api/global-prompts", golbalpromptsRoutes);
app.use("/api/globalprompts", golbalpromptsRoutes)
app.use("/api/cdrs", cdrsRoutes);
app.use("/api/tokens", tokensRoutes);
app.use("/api/tenantrealtime", tenantRealtimeRoute);
app.use("/api/registration", tenantRegistration);
app.use("/api/voice-prompts", tenatVoiceprompts);
app.use("/api/extension-groups", tenantExtensionGroup);
app.use("/api/extensions", tenantExtensions);
app.use("/api/tenantdids", tenantDids);
app.use("/api/tenantcdrs", tenantCdrs);
app.use("/api/features", tenantFeatures);
app.use("/api/e911-addresses", tenantE911Addresses);
app.use("/api/e911-endpoints", tenantE911Endpoints);
app.use("/api/ring-groups", tenantRingGroups);
app.use("/api/ivrs", tenantIvrs);
app.use("/api/ai-agents", tenantAiagents);
app.use("/api/wakeup-call", tenantWakeupcalls);
app.use("/api/voicemail", tenantVoicemails);
app.use("/api/voicemail-boxes", tenantVoicemailbox);
app.use("/api/speed-dials", tenantSpeeddials);
app.use("/api/pms", tenantPms);
app.use("/api/fax", tenantFax);
app.use("/api/summary", tenantSummary);
app.use("/api/graphs", tenantSummaryGraph);
app.use("/api/network", networkconfig);

/* ===== BASIC HEALTH ===== */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

/* =========================================================
   GLOBAL DASHBOARD SUMMARY (HTTP)
   Calls PBX: /api/dashboard/summary
========================================================= */
app.get("/api/global/summary", async (req, res) => {
  try {
    const nodes = await getPbxNodes();
    const results = [];

    for (const node of nodes) {
      try {
        const response = await axios.get(
          `${node.baseUrl.replace(/\/$/, "")}/api/dashboard/summary`,
          {
            headers: { Authorization: `Bearer ${node.token}` },
            timeout: 10000,
          }
        );

        results.push({
          node: node.name,
          ok: true,
          summary: response.data,
        });
      } catch (e) {
        results.push({
          node: node.name,
          ok: false,
          error: e?.response?.data || e.message,
        });
      }
    }

    res.json({ nodes: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================================================
   SOCKET.IO – REAL-TIME GLOBAL SUMMARY
========================================================= */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("subscribe_global_summary", () => {
    socket.join("global_summary");
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* ===== EMIT GLOBAL SUMMARY EVERY 5s ===== */
async function emitGlobalSummary() {
  try {
    const nodes = await getPbxNodes();
    const payload = [];

    for (const node of nodes) {
      try {
        const response = await axios.get(
          `${node.baseUrl.replace(/\/$/, "")}/api/dashboard/summary`,
          {
            headers: { Authorization: `Bearer ${node.token}` },
            timeout: 10000,
          }
        );

        payload.push({
          node: node.name,
          ok: true,
          summary: response.data,
        });
      } catch (e) {
        payload.push({
          node: node.name,
          ok: false,
          error: e.message,
        });
      }
    }

    io.to("global_summary").emit("global_summary", {
      nodes: payload,
      ts: Date.now(),
    });
  } catch (e) {
    console.error("emitGlobalSummary error:", e.message);
  }
}

/* ===== START POLLER ===== */
setInterval(() => {
  emitGlobalSummary();
}, 5000);

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 5050;

// server.listen(PORT, () => {
//   console.log(`✅ Backend running on http://localhost:${PORT}`);
// });


server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on http://0.0.0.0:${PORT}`);
});