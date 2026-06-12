import { WebSocket } from "ws";
import { prisma } from "../db";

/**
 * Opens a sideband WebSocket to the OpenAI Realtime API for a given call.
 * Listens for assistant responses and persists them to the database.
 */
export async function initSideBand(callId: string, interviewId: string) {
  const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
  const ws = new WebSocket(url, {
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },
  });

  const interview = await prisma.interview.findFirst({
    where: { id: interviewId },
  });

  ws.on("open", function open() {
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: `
          You are an expert computer science interviewer. Your goal is to evaluate the candidate's technical knowledge based on their resume and GitHub profile.
          
          Rules:
          1. Ask 3-4 fundamental questions about each technology listed on their resume and GitHub.
          2. Probe deeper if their answers are superficial.
          3. Focus on practical understanding and project experience.
          4. Only use English.
          5. After covering all topics, provide a final summary and score.

          ## GitHub Data
          ${interview?.githubMetaData}

          ## Resume
          ${interview?.resume}
          `,
        },
      })
    );
  });

  ws.on("message", async function incoming(message) {
    const parsedMessage = JSON.parse(message.toString());
    if (parsedMessage.type === "response.done") {
      let contents: { type: string; transcript: string }[] = [];
      parsedMessage.response.output.forEach(
        (x: { content: { type: string; transcript: string }[] }) => {
          contents = [...contents, ...x.content];
        }
      );
      // The OpenAI realtime API uses "audio" as the content type for spoken output
      const assistantMessage = contents
        .filter((x) => x.type === "audio")
        .map((x) => x.transcript)
        .join(" ");

      if (assistantMessage) {
        await prisma.message.create({
          data: {
            interviewId,
            type: "Assistant",
            message: assistantMessage,
          },
        });
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[sideband] WebSocket error:", err);
  });
}
