import express from 'express';
import { PreInterviewBody } from './types';
const app = express();
app.use(express.json());

app.post('/api/v1/pre-interview', (req, res) => {
  const {success, data} = PreInterviewBody.safeParse(req.body);
  if(!success) {
    return res.status(400).json({error: "Invalid data"});
  }
  const github = data.github.endsWith("/") ? data.github.slice(0,-1) : data.github;
  const linkedIn = data.linkedIn.endsWith("/") ? data.linkedIn.slice(0,-1) : data.linkedIn;

});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});