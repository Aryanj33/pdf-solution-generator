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
app.use(cors());
mongoose.set('strictQuery', false);
const upload = multer({ dest: 'uploads/' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pdf_solution')
  .catch(err => console.error('MongoDB connection error:', err));

const Submission = mongoose.model('Submission', {
  id: String,
  originalPdfPath: String,
  solutionPdfPath: String,
  createdAt: { type: Date, default: Date.now },
  enrollment: String,
  name: String,
  batch: String
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.use(express.static('public'));

async function generateContentWithRetry(prompt, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      if (!result || !result.response || !result.response.text) {
        throw new Error('Invalid Gemini response');
      }
      return result.response.text();
    } catch (error) {
      if (error.status === 503 && attempt < retries) {
        console.log(`503 error. Retry ${attempt} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Gemini API retries failed');
}

// Strip generic filler content from Gemini
function cleanGeminiOutput(rawText) {
  const filteredLines = rawText
    .split('\n')
    .filter(line =>
      !/remember to/i.test(line) &&
      !/you should/i.test(line) &&
      !/compile/i.test(line) &&
      !/enroll/i.test(line) &&
      !/this comprehensive/i.test(line)
    );
  return filteredLines.join('\n').trim();
}

app.post('/upload', upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'enrollment' }, { name: 'name' }, { name: 'batch' }]), async (req, res) => {
  try {
    const file = req.files['pdf']?.[0];
    const enrollment = req.body.enrollment || 'Unknown';
    const name = req.body.name || 'Unknown';
    const batch = req.body.batch || 'Unknown';

    if (!file) return res.status(400).send('No file uploaded.');

    const submissionId = uuidv4();
    const originalPdfPath = file.path;
    const dataBuffer = fs.readFileSync(originalPdfPath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    if (!text.toLowerCase().includes('assignment') && !text.toLowerCase().includes('lab')) {
      return res.status(400).send('Not a valid assignment or lab PDF.');
    }

    if (text.length > 5000) {
      return res.status(400).send('PDF is too large.');
    }

    const prompt = `
You are a professional coding assistant. Read the assignment text and generate structured answers with:
- Bold question titles using **Q1**, **Q2**, etc.
- Use code blocks (triple backticks) for all code.
- Add spacing between questions.
- No filler advice like "remember to compile" or "replace XYZ".

Assignment Text:
${text}
`;

    const rawSolution = await generateContentWithRetry(prompt);
    const solution = cleanGeminiOutput(rawSolution);

    const outputFilename = `${enrollment}_${name.replace(/ /g, '_')}_${batch}.pdf`.replace(/[^a-zA-Z0-9_]/g, '_');
    const solutionPdfPath = path.join(__dirname, 'solutions', outputFilename);
    const solutionsDir = path.join(__dirname, 'solutions');
    if (!fs.existsSync(solutionsDir)) fs.mkdirSync(solutionsDir, { recursive: true });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(fs.createWriteStream(solutionPdfPath));

    doc.font('Times-Bold').fontSize(16).text('Assignment Solution', { align: 'center' });
    doc.moveDown();
    doc.font('Times-Roman').fontSize(12).text(`Enrollment: ${enrollment}`);
    doc.text(`Name: ${name}`);
    doc.text(`Batch: ${batch}`);
    doc.moveDown();

    const lines = solution.split('\n');
    let inCodeBlock = false;

    for (let line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          doc.moveDown(0.5);
          doc.font('Courier').fontSize(10);
          doc.fillColor('black');
        } else {
          doc.moveDown(0.5);
          doc.font('Times-Roman').fontSize(12);
        }
        continue;
      }

      if (inCodeBlock) {
        doc.text(line, { lineGap: 2 });
      } else if (/^\*\*(.*?)\*\*/.test(line)) {
        const plain = line.replace(/\*\*/g, '');
        doc.font('Times-Bold').fontSize(13).text(plain);
        doc.moveDown(0.5);
        doc.font('Times-Roman').fontSize(12);
      } else {
        doc.text(line, { lineGap: 4 });
      }
    }

    doc.end();

    const submission = new Submission({
      id: submissionId,
      originalPdfPath,
      solutionPdfPath,
      enrollment,
      name,
      batch
    });
    await submission.save();

    res.json({ submissionId });
  } catch (error) {
    console.error('Upload Error:', error.message, error.stack);
    res.status(500).send('An internal error occurred.');
  }
});

app.get('/download/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submission = await Submission.findOne({ id: submissionId });
    if (!submission) return res.status(404).send('Submission not found.');
    res.download(submission.solutionPdfPath, path.basename(submission.solutionPdfPath));
  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).send('Error retrieving file.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
