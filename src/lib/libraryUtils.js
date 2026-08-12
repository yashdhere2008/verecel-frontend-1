export const roleAccessMap = {
  admin: {
    canManageBooks: true,
    canManageUsers: true,
    canApproveLoans: true,
    canAssignRoles: true,
  },
  librarian: {
    canManageBooks: true,
    canManageUsers: false,
    canApproveLoans: true,
    canAssignRoles: false,
  },
  student: {
    canManageBooks: false,
    canManageUsers: false,
    canApproveLoans: false,
    canAssignRoles: false,
  },
}

export function getRoleAccess(role) {
  return roleAccessMap[role] ?? roleAccessMap.student
}

export function filterBooks(books, searchTerm = '') {
  const normalized = searchTerm.trim().toLowerCase()

  if (!normalized) {
    return books
  }

  return books.filter((book) => {
    const haystack = `${book.title} ${book.author} ${book.category ?? ''}`.toLowerCase()
    return haystack.includes(normalized)
  })
}

export function getBookStatusCounts(books) {
  return books.reduce((acc, book) => {
    const status = book.status ?? 'available'
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
}
