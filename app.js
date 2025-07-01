require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf_solution', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Define Submission model
const Submission = mongoose.model('Submission', {
  id: String,
  originalPdfPath: String,
  solutionPdfPath: String,
  createdAt: { type: Date, default: Date.now }
});

// Set up Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Serve static files
app.use(express.static('public'));

// Route for uploading PDF
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    // Generate unique ID
    const submissionId = uuidv4();

    // Save original PDF path
    const originalPdfPath = file.path;

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(originalPdfPath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Send text to Gemini
    const prompt = `Generate a coding solution for the following problem:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const solution = result.response.text();

    // Generate solution PDF
    const solutionPdfPath = path.join('solutions', `${submissionId}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(solutionPdfPath));
    doc.fontSize(12).text('Coding Solution', { align: 'center' });
    doc.moveDown();
    doc.text(solution);
    doc.end();

    // Save submission to database
    const submission = new Submission({
      id: submissionId,
      originalPdfPath,
      solutionPdfPath,
    });
    await submission.save();

    res.json({ submissionId });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred.');
  }
});

// Route for downloading solution PDF
app.get('/download/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await Submission.findOne({ id: submissionId });
    if (!submission) {
      return res.status(404).send('Submission not found.');
    }

    const solutionPdfPath = submission.solutionPdfPath;
    res.download(solutionPdfPath);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});