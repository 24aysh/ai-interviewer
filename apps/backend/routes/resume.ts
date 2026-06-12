import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * POST /upload/resume
 * Accepts a PDF file and returns its extracted text content.
 */
router.post("/resume", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a PDF file." });
  }

  const pdfData = await pdfParse(req.file.buffer);
  res.json({ success: true, text: pdfData.text });
});

export default router;
