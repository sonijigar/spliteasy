/**
 * Unit tests for the User model.
 *
 * Instance methods (comparePassword, toJSON) work on mongoose instances
 * without a DB connection.  Pre-save hooks are exercised by calling
 * schema.execPre() directly — also no DB required.
 */
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');

// Helper: run all pre-save hooks for a User instance using mongoose 8's kareem API
async function runPreSave(user) {
  await new Promise((resolve, reject) => {
    User.schema.s.hooks.execPre('save', user, (err) => (err ? reject(err) : resolve()));
  });
}

describe('User model — comparePassword()', () => {
  test('returns true for the correct password', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: hash });
    await expect(user.comparePassword('secret123')).resolves.toBe(true);
  });

  test('returns false for an incorrect password', async () => {
    const hash = await bcrypt.hash('secret123', 10);
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: hash });
    await expect(user.comparePassword('wrongpassword')).resolves.toBe(false);
  });
});

describe('User model — toJSON()', () => {
  test('strips the password field from the output', () => {
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: 'hashed' });
    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.name).toBe('Alice');
  });
});

describe('User model — pre-save hooks', () => {
  test('hashes a plaintext password before save', async () => {
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: 'plaintext' });
    await runPreSave(user);
    expect(user.password).not.toBe('plaintext');
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
  });

  test('does not re-hash when password has not changed', async () => {
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: 'plaintext' });
    await runPreSave(user);
    const firstHash = user.password;
    // Simulate a subsequent save where only the name changed
    user.$__.activePaths.states.modify = {};
    await runPreSave(user);
    expect(user.password).toBe(firstHash);
  });

  test('auto-populates qrCode with spliteasy:<_id> format', async () => {
    const user = new User({ name: 'Alice', phone: '+1 555 0001', password: 'plaintext' });
    await runPreSave(user);
    expect(user.qrCode).toBe(`spliteasy:${user._id}`);
  });
});
