import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health check API', () => {
  it('GET /api/health returns 200 with ok status and app name', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBe('PsyPrep API');
    expect(res.body.timestamp).toBeDefined();
  });
});
