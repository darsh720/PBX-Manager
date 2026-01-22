const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function pbxRequest(node, method, endpoint, data = null) {
  if (!node || !node.baseUrl) {
    throw new Error("PBX baseUrl is undefined");
  }

  const base = node.baseUrl.replace(/\/$/, "");
  const url = `${base}${endpoint}`;

  const res = await axios({
    method,
    url,
    data,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${node.token}`,
      "Content-Type": "application/json",
    },
    httpsAgent,
  });

  return res.data;
}

module.exports = { pbxRequest };
