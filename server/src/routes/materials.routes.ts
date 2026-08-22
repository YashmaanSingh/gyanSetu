import { Router } from "express";
import { requireAdmin, requireStudent, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as c from "../controllers/materials.controller";
import { createMaterialSchema, updateMaterialSchema } from "../validators";

const router = Router();

router.use(requireAuth);

router.get("/", c.listMaterials);
router.get("/:id", c.getMaterial);
router.post("/", requireAdmin, validate(createMaterialSchema), c.createMaterial);
router.put("/:id", requireAdmin, validate(updateMaterialSchema), c.updateMaterial);
router.patch("/:id/status", requireAdmin, c.patchMaterialStatus);
router.delete("/:id", requireAdmin, c.deleteMaterial);
router.post("/:id/complete", requireStudent, c.completeMaterial);

export default router;
