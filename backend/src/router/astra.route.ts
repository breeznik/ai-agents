import express from "express";
import { RagHandler } from "../controller/astra.controller";

const router = express.Router();

// POST /api/context
router.post("/", RagHandler);

export default router;
