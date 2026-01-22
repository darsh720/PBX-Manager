type PbxConfig = {
  key: string;
  name: string;
  url: string;
};

export function loadPbxConfigs(): PbxConfig[] {
  const configs: PbxConfig[] = [];

  Object.keys(process.env).forEach((key) => {
    if (key.endsWith("_URL") && key.startsWith("PBX_")) {
      const prefix = key.replace("_URL", "");

      const url = process.env[`${prefix}_URL`];
      const token = process.env[`${prefix}_TOKEN`];

      if (url && token) {
        configs.push({
          key: prefix,
          name: prefix.replace("PBX_", "PBX "),
          url,
        });
      }
    }
  });

  return configs;
}
