import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardPath } from './roleRoutes.js';

test('maps student role to student dashboard', () => {
  assert.equal(getDashboardPath('student'), '/student-dashboard');
});

test('maps admin role to admin dashboard', () => {
  assert.equal(getDashboardPath('admin'), '/admin-dashboard');
});

test('maps librarian role to librarian dashboard', () => {
  assert.equal(getDashboardPath('librarian'), '/librarian-dashboard');
});
