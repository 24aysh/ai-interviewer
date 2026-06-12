import express from 'express';
import axios from "axios"
import cors from 'cors';
import { PreInterviewBody } from './types';
import { prisma } from "./db"
import { initSideBand } from './sideband';
import multer from "multer";
import pdfParse from "pdf-parse"


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function getGithubUsername(github: string) {
  let normalized = github.trim().replace(/\/$/, "");

  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    if (normalized.includes("github.com/")) {
      normalized = "https://" + normalized;
    } else {
      return normalized.includes("/") ? null : normalized;
    }
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
  const resume = data.resume;

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
        status: "Pre",
        resume
      }
    })

    res.status(200).json({ id: interviewId.id });
  } catch (error) {
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

app.post("/api/v1/session/user/:interviewId", async (req,res) => {
  const {message} = req.body;
  await prisma.message.create({
    data :{
      interviewId: req.params.interviewId,
      type: "User",
      message:message
    }
  })
  res.json({
    "Message" : "Message Saved to DB"
  });
})

app.get("/api/v1/results/:interviewId", async (req,res) => {
  const interview = await prisma.interview.findFirst(
    {
      where : {
        id : req.params.interviewId
      },
      include :{
        conversations : true
      }
    }
  )
  if (!interview){
    res.status(411).json({
      Error : "Interview not found"
    })
    return;
  }
  
  if(interview.status !== "Done"){
    try {
      const { calculateResult } = await import("./result");
      const evalResult = await calculateResult(interview.conversations);
      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: "Done",
          score: evalResult.score,
          feedback: evalResult.feedback
        }
      });
      interview.score = evalResult.score;
      interview.feedback = evalResult.feedback;
      interview.status = "Done";
    } catch (e) {
      console.error(e);
    }
  }

  res.json({
    transcript: interview?.conversations.map( c=> ({
      type : c.type,
      content : c.message,
      createdAt : c.createdAt
    })),
    score : interview?.score,
    feedback: interview?.feedback,
    status: interview?.status
  })

})

app.post('/upload/resume', upload.single("resume"),async (req,res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Please upload a PDF file.",
    });
  }

  const pdfData = await pdfParse(req.file.buffer);

  console.log(pdfData.text);

  res.json({
    success: true,
    text: pdfData.text,
  });
  
})

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});