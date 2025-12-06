import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";
import User from "../models/User.js"; // make sure your User model exists

export async function createSession(req, res) {
  try {
    console.log("🔥 createSession endpoint hit");      // endpoint called
    console.log("Request body:", req.body);            // what frontend sent
    console.log("req.auth object:", req.auth);         // check Clerk auth

    const { problem, difficulty } = req.body;

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    // ✅ get Clerk ID from token
    const clerkId = req.auth?.userId || "test-user-123";
    console.log("Using clerkId:", clerkId);

    // ✅ find or create local DB user
    let user = await User.findOne({ clerkId });
    if (!user) {
  user = await User.create({
    clerkId,
    name: req.auth.sessionClaims?.name || "Unknown",
    email: req.auth.sessionClaims?.email || "noemail@example.com"
  });
}
    const userId = user._id;

    console.log("MongoDB userId:", userId, "ClerkId:", clerkId);

    // generate unique call id
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // create session in DB
    const session = await Session.create({ problem, difficulty, host: userId, callId });
    console.log("🔥 Session created in DB:", session);

    // create Stream video call
    const streamCall = await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() },
      },
    });
    console.log("🔥 Stream video call created:", streamCall);

    // create chat channel
    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });
    const createdChannel = await channel.create();
    console.log("🔥 Chat channel created:", createdChannel);

    res.status(201).json({ session });
  } catch (error) {
    console.error("❌ Error in createSession controller:", error.message);
    console.error("❌ Detailed error object:", error);
    console.error("❌ Stream response error (if any):", error.response?.data);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userId = user._id;

    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userId = user._id;

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "active") return res.status(400).json({ message: "Cannot join a completed session" });
    if (session.host.toString() === userId.toString()) return res.status(400).json({ message: "Host cannot join their own session as participant" });
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userId = user._id;

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.host.toString() !== userId.toString()) return res.status(403).json({ message: "Only the host can end the session" });
    if (session.status === "completed") return res.status(400).json({ message: "Session is already completed" });

    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.error("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
