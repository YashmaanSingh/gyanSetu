import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as c from "../controllers/search.controller";

const router = Router();

router.use(requireAuth);
router.get("/", c.search);

export default router;
