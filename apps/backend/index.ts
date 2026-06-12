import express from "express";
import cors from "cors";
import interviewRouter from "./routes/interview";
import resumeRouter from "./routes/resume";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ["application/sdp", "text/plain"] }));

app.use("/api/v1", interviewRouter);
app.use("/upload", resumeRouter);

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});