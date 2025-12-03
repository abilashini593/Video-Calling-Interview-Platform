import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createSession,
  endSession,
  getActiveSessions,
  getMyRecentSessions,
  getSessionById,
  joinSession,
} from "../controllers/sessionController.js";

const router = express.Router();

// Create a new session
router.post("/", protectRoute, createSession);

// Get active sessions
router.get("/active", protectRoute, getActiveSessions);

// Get my recent sessions
router.get("/my-recent", protectRoute, getMyRecentSessions);

// Get session by ID
router.get("/:id", protectRoute, getSessionById);

// Join a session
router.post("/:id/join", protectRoute, joinSession);

// End a session
router.post("/:id/end", protectRoute, endSession);

export default router;
