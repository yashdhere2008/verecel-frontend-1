import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoleAccess, filterBooks, getBookStatusCounts } from './libraryUtils.js'

test('admin gets full management access', () => {
  const access = getRoleAccess('admin')

  assert.equal(access.canManageBooks, true)
  assert.equal(access.canManageUsers, true)
  assert.equal(access.canApproveLoans, true)
})

test('librarian can manage books but not system settings', () => {
  const access = getRoleAccess('librarian')

  assert.equal(access.canManageBooks, true)
  assert.equal(access.canManageUsers, false)
  assert.equal(access.canApproveLoans, true)
})

test('filterBooks matches title and author search terms', () => {
  const books = [
    { id: 1, title: 'Atomic Habits', author: 'James Clear', status: 'available' },
    { id: 2, title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'borrowed' },
  ]

  const result = filterBooks(books, 'tolkien')

  assert.equal(result.length, 1)
  assert.equal(result[0].title, 'The Hobbit')
})

test('getBookStatusCounts totals status values', () => {
  const books = [
    { status: 'available' },
    { status: 'borrowed' },
    { status: 'reserved' },
    { status: 'available' },
  ]

  const counts = getBookStatusCounts(books)

  assert.deepEqual(counts, { available: 2, borrowed: 1, reserved: 1 })
})
