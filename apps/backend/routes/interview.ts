import { Router } from "express";
import { prisma } from "../db";
import { PreInterviewBody } from "../types";
import { getGithubUsername, fetchGithubRepos } from "../services/github";
import { initSideBand } from "../services/realtime";
import { calculateResult } from "../services/ai";

const router = Router();

/**
 * POST /api/v1/pre-interview
 * Validates GitHub URL, fetches repos, and creates an interview record.
 */
router.post("/pre-interview", async (req, res) => {
  const { success, data } = PreInterviewBody.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const githubUserName = getGithubUsername(data.github);
  if (!githubUserName) {
    return res.status(400).json({ error: "Invalid GitHub profile URL" });
  }

  try {
    const repos = await fetchGithubRepos(githubUserName);

    const interview = await prisma.interview.create({
      data: {
        githubMetaData: repos as any,
        status: "Pre",
        resume: data.resume,
      },
    });

    res.status(200).json({ id: interview.id });
  } catch (error) {
    console.error("[pre-interview] GitHub fetch error:", error);
    res.status(502).json({ error: "Failed to fetch GitHub repositories" });
  }
});

/**
 * POST /api/v1/session/:interviewId
 * Initiates a WebRTC session with OpenAI Realtime and returns the SDP answer.
 */
router.post("/session/:interviewId", async (req, res) => {
  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime-2",
    audio: { output: { voice: "marin" } },
  });

  const fd = new FormData();
  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": "hashed-user-id",
      },
      body: fd,
    });

    const location = r.headers.get("Location");
    const callId = location?.split("/").pop();
    const sdp = await r.text();

    res.send(sdp);
    initSideBand(String(callId), req.params.interviewId);
  } catch (error) {
    console.error("[session] Error:", error);
    res.status(500).json({ error: "Failed to initiate session" });
  }
});

/**
 * POST /api/v1/session/user/:interviewId
 * Persists a transcribed user message to the database.
 */
router.post("/session/user/:interviewId", async (req, res) => {
  const { message } = req.body;
  await prisma.message.create({
    data: {
      interviewId: req.params.interviewId,
      type: "User",
      message,
    },
  });
  res.json({ message: "Message saved to DB" });
});

/**
 * GET /api/v1/results/:interviewId
 * Returns the interview transcript, score, and feedback.
 * Triggers evaluation if the interview hasn't been scored yet.
 */
router.get("/results/:interviewId", async (req, res) => {
  const interview = await prisma.interview.findFirst({
    where: { id: req.params.interviewId },
    include: { conversations: true },
  });

  if (!interview) {
    return res.status(404).json({ error: "Interview not found" });
  }

  if (interview.status !== "Done") {
    try {
      const evalResult = await calculateResult(interview.conversations);
      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: "Done",
          score: evalResult.score,
          feedback: evalResult.feedback,
        },
      });
      interview.score = evalResult.score;
      interview.feedback = evalResult.feedback;
      interview.status = "Done";
    } catch (e) {
      console.error("[results] Evaluation error:", e);
    }
  }

  res.json({
    transcript: interview.conversations.map((c) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt,
    })),
    score: interview.score,
    feedback: interview.feedback,
    status: interview.status,
  });
});

export default router;
