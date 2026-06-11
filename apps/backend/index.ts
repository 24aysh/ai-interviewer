import express from 'express';
import axios from "axios"
import cors from 'cors';
import { PreInterviewBody } from './types';
import { prisma } from "./db"
import { initSideBand } from './sideband';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

function getGithubUsername(github: string) {
  const normalized = github.trim().replace(/\/$/, "");

  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    return normalized.includes("/") ? null : normalized;
  }

  try {
    const url = new URL(normalized);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }

    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

app.post('/api/v1/pre-interview',async (req, res) => {
  const {success, data} = PreInterviewBody.safeParse(req.body);
  if(!success) {
    return res.status(400).json({error: "Invalid data"});
  }
  const githubUserName = getGithubUsername(data.github);

  if (!githubUserName) {
    return res.status(400).json({ error: "Invalid GitHub profile URL" });
  }

  try {
    const userRepos = await axios.get(`https://api.github.com/users/${githubUserName}/repos`);
    const scrap = userRepos.data.map((x:any) => ({
      description : x.description,
      name: x.name,
      fullName: x.full_name,
      starCount: x.stargazers_count
    }))

    const interviewId = await prisma.interview.create({
      data:{
        githubMetaData : JSON.stringify(scrap),
        status: "Pre"
      }
    })
    
    res.status(200).json({ id: interviewId.id });
  } catch (error) {
    console.error("Failed to create pre-interview:", error);
    res.status(502).json({ error: "Failed to fetch GitHub repositories" });
  }
});

app.post("/api/v1/session/:interviewId", async (req, res) => {
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
    // Send back the SDP we received from the OpenAI REST API
    const location = r.headers.get("Location");
    const callId = location?.split("/").pop();
    const sdp = await r.text();
    res.send(sdp);
    initSideBand(String(callId),req.params.interviewId);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});


app.listen(3001, () => {
  console.log('Server is running on port 3001');
});