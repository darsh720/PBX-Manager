import { Router, Request, Response } from "express";
import { loadPbxConfigs } from "../config/pbx.config";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const pbxs = loadPbxConfigs();

  res.json({
    success: true,
    data: pbxs,
  });
});

export default router;
