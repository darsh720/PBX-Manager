require("dotenv").config();

const nodes = [
  {
    key: "pbx_a",
    name: "PBX_A",
    baseUrl: process.env.PBX_A_URL,
    token: process.env.PBX_A_TOKEN,
  },
];

// DEBUG (VERY IMPORTANT)
console.log("PBX NODES LOADED:", nodes);

module.exports = nodes;
