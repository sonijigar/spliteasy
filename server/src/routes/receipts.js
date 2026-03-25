const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const auth = require('../middleware/auth');

const router = express.Router();

// Use memory storage - no files written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * Extract the total amount from OCR text.
 * Looks for "Total: $12.34" style patterns first, then falls back to
 * taking the largest dollar amount found in the text.
 */
function extractAmount(text) {
  // Try to find a labeled total first
  const labeledRegex = /(?:total|amount|subtotal|sum|grand\s*total)[:\s]*\$?(\d+\.?\d*)/i;
  const labeledMatch = text.match(labeledRegex);
  if (labeledMatch) {
    return parseFloat(labeledMatch[1]);
  }

  // Fall back to finding all dollar amounts and taking the largest
  const dollarRegex = /\$(\d+\.\d{2})/g;
  const allAmounts = [...text.matchAll(dollarRegex)];
  if (allAmounts.length > 0) {
    return Math.max(...allAmounts.map(m => parseFloat(m[1])));
  }

  return null;
}

/**
 * Extract the merchant / description from OCR text.
 * The first non-trivial line of text is typically the store name.
 */
function extractDescription(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2);

  return lines.length > 0 ? lines[0].substring(0, 100) : 'Receipt';
}

// POST /api/receipts/scan
// Accepts multipart/form-data with a single "receipt" image field.
router.post('/scan', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;

    // Run Tesseract OCR on the image buffer
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, 'eng');

    const amount = extractAmount(text);
    const description = extractDescription(text);

    res.json({
      success: true,
      data: {
        amount: amount || null,
        description,
        rawText: text.substring(0, 500), // included for debugging
      },
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

module.exports = router;
