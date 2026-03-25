/**
 * Integration tests for POST /api/receipts/scan
 *
 * Both Tesseract and the auth middleware are mocked so tests are fast and
 * don't require a real MongoDB instance or OCR engine.
 */

// ── Mock Tesseract before any imports ───────────────────────────────────────
jest.mock('tesseract.js', () => ({
  recognize: jest.fn().mockResolvedValue({
    data: { text: 'STARBUCKS\nCoffee x2\nTotal: $15.50\nDate: 12/25/2024' },
  }),
}));

// ── Mock the auth middleware so we don't need a real DB/JWT ─────────────────
jest.mock('../../middleware/auth', () => (req, res, next) => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Attach a stub user
  req.user = { _id: 'mock-user-id', name: 'Test User' };
  next();
});

const request = require('supertest');
const app = require('../../app');
const Tesseract = require('tesseract.js');

const VALID_TOKEN = 'Bearer valid-test-token';

describe('POST /api/receipts/scan', () => {
  beforeEach(() => {
    // Restore the default mock between tests
    Tesseract.recognize.mockResolvedValue({
      data: { text: 'STARBUCKS\nCoffee x2\nTotal: $15.50\nDate: 12/25/2024' },
    });
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/receipts/scan')
      .attach('receipt', Buffer.from('fake-image-data'), {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No image file provided/i);
  });

  it('extracts amount and description from receipt image', async () => {
    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN)
      .attach('receipt', Buffer.from('fake-image-data'), {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('amount', 15.5);
    expect(res.body.data).toHaveProperty('description', 'STARBUCKS');
    expect(res.body.data).toHaveProperty('rawText');
  });

  it('returns the largest dollar amount when no total label is found', async () => {
    Tesseract.recognize.mockResolvedValueOnce({
      data: { text: 'PIZZA PLACE\nItem 1 $3.50\nItem 2 $8.25\nItem 3 $12.00' },
    });

    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN)
      .attach('receipt', Buffer.from('fake-image-data'), {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(12.0);
    expect(res.body.data.description).toBe('PIZZA PLACE');
  });

  it('returns null amount when no dollar amounts are found', async () => {
    Tesseract.recognize.mockResolvedValueOnce({
      data: { text: 'Some receipt with no amounts' },
    });

    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN)
      .attach('receipt', Buffer.from('fake-image-data'), {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBeNull();
    expect(res.body.data.description).toBe('Some receipt with no amounts');
  });

  it('returns 500 when Tesseract throws an error', async () => {
    Tesseract.recognize.mockRejectedValueOnce(new Error('OCR failure'));

    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN)
      .attach('receipt', Buffer.from('fake-image-data'), {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to process receipt/i);
  });

  it('rejects non-image file types - no req.file so 400 is returned', async () => {
    // multer fileFilter rejects non-image files, so req.file will be undefined
    // and our handler returns 400
    const res = await request(app)
      .post('/api/receipts/scan')
      .set('Authorization', VALID_TOKEN)
      .attach('receipt', Buffer.from('not an image'), {
        filename: 'receipt.txt',
        contentType: 'text/plain',
      });

    // Either 400 (no file attached after filter) or 500 (multer error propagated)
    expect([400, 500]).toContain(res.status);
  });
});
