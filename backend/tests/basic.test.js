import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Health Check', () => {
  it('should verify the server module can be imported', async () => {
    // Verify server.js is valid ES module syntax
    const mod = await import('../src/server.js');
    assert.ok(mod, 'Server module loaded');
  });
});

describe('DB Schema', () => {
  it('should create tables without error', async () => {
    const { db } = await import('../src/db.js');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    const names = tables.map(t => t.name);
    assert.ok(names.includes('jobs'), 'jobs table exists');
    assert.ok(names.includes('applications'), 'applications table exists');
    assert.ok(names.includes('user_profile'), 'user_profile table exists');
    assert.ok(names.includes('email_log'), 'email_log table exists');
  });

  it('should list jobs (empty or with data)', async () => {
    const { listJobs } = await import('../src/db.js');
    const rows = listJobs({});
    assert.ok(Array.isArray(rows), 'listJobs returns array');
  });

  it('should return stats', async () => {
    const { stats } = await import('../src/db.js');
    const s = stats();
    assert.ok(typeof s.total === 'number', 'stats has total');
    assert.ok(typeof s.avgScore === 'number', 'stats has avgScore');
  });
});
