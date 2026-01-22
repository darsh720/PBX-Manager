const db = require("../db");

async function getPbxNodes() {
  const [rows] = await db.query(
    "SELECT id, name, base_url, api_token FROM pbx_nodes WHERE enabled = 1"
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    baseUrl: r.base_url,
    token: r.api_token,
  }));
}

module.exports = { getPbxNodes };
