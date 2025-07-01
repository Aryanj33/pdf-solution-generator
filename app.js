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
const cors = require('cors');

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pdf_solution')
  .catch(err => console.error('MongoDB connection error:', err));

// Define Submission model
const Submission = mongoose.model('Submission', {
  id: String,
  originalPdfPath: String,
  solutionPdfPath: String,
  createdAt: { type: Date, default: Date.now },
  enrollment: String,
  name: String,
  batch: String
});

// Set up Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Serve static files
app.use(express.static('public'));

// Helper function to generate content with retries
async function generateContentWithRetry(prompt, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      if (!result || !result.response || !result.response.text) {
        throw new Error('Failed to get a valid response from Gemini API');
      }
      return result.response.text();
    } catch (error) {
      if (error.status === 503 && attempt < retries) {
        console.log(`Attempt ${attempt} failed with 503. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Re-throw if not 503 or retries exhausted
      }
    }
  }
  throw new Error('All retry attempts failed');
}

// Route for uploading PDF
app.post('/upload', upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'enrollment' }, { name: 'name' }, { name: 'batch' }]), async (req, res) => {
  console.log('Received /upload request');
  try {
    const file = req.files['pdf'] ? req.files['pdf'][0] : null;
    const enrollment = req.body.enrollment || 'Unknown';
    const name = req.body.name || 'Unknown';
    const batch = req.body.batch || 'Unknown';
    console.log('File received:', file, 'Enrollment:', enrollment, 'Name:', name, 'Batch:', batch);

    if (!file) {
      console.log('No file uploaded');
      return res.status(400).send('No file uploaded.');
    }

    const submissionId = uuidv4();
    console.log('Generated submission ID:', submissionId);
    const originalPdfPath = file.path;
    console.log('Original PDF path:', originalPdfPath);

    const dataBuffer = fs.readFileSync(originalPdfPath);
    console.log('PDF buffer read');
    const data = await pdfParse(dataBuffer);
    console.log('PDF text extracted');
    const text = data.text;

    if (!text.toLowerCase().includes('assignment') && !text.toLowerCase().includes('lab')) {
      console.log('Not an assignment PDF');
      return res.status(400).send('This is not an assignment PDF. Please upload a valid assignment or lab document.');
    }

    if (text.length > 5000) {
      console.log('PDF too large');
      return res.status(400).send('PDF is too large. Please limit the content to a manageable size for processing.');
    }

    const prompt = `You are a professional coding assistant. Please provide detailed, well-structured, and optimized solutions for each question listed in the following assignment PDF text. Ensure the code is commented, follows best practices, and addresses all specified requirements. If a question cannot be solved due to incomplete information, note it clearly. Assignment text:\n\n${text}`;
    console.log('Sending prompt to Gemini:', prompt);
    const solution = await generateContentWithRetry(prompt);
    console.log('Gemini response received');

    const outputFilename = `${enrollment}_${name.replace(/ /g, '_')}_${batch}.pdf`.replace(/[^a-zA-Z0-9_]/g, '_');
    const solutionPdfPath = path.join(__dirname, 'solutions', outputFilename);
    console.log('Generating solution PDF at:', solutionPdfPath);
    const solutionsDir = path.join(__dirname, 'solutions');
    if (!fs.existsSync(solutionsDir)) {
      fs.mkdirSync(solutionsDir, { recursive: true });
      console.log('Created solutions directory:', solutionsDir);
    }

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(solutionPdfPath));
    doc.fontSize(12).text('Coding Solution', { align: 'center' });
    doc.moveDown();
    doc.text(`Enrollment: ${enrollment}, Name: ${name}, Batch: ${batch}`);
    doc.moveDown();
    doc.text(solution);
    doc.end();

    const submission = new Submission({
      id: submissionId,
      originalPdfPath,
      solutionPdfPath,
      enrollment,
      name,
      batch
    });
    console.log('Saving submission to MongoDB');
    await submission.save();

    console.log('Sending response with submission ID:', submissionId);
    res.json({ submissionId });
  } catch (error) {
    console.error('Error in /upload:', error.message, error.stack);
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
    res.download(solutionPdfPath, path.basename(solutionPdfPath)); // Ensure filename includes .pdf
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});