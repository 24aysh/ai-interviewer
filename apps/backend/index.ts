import express from 'express';
import axios from "axios"
import cors from 'cors';
import { PreInterviewBody } from './types';
import { prisma } from "./db"


const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/v1/pre-interview',async (req, res) => {
  const {success, data} = PreInterviewBody.safeParse(req.body);
  if(!success) {
    return res.status(400).json({error: "Invalid data"});
  }
  const github = data.github.endsWith("/") ? data.github.slice(0,-1) : data.github;
  const githubUserName = github.slice(19);

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
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});