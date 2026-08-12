export const getDashboardPath = (role) => {
  const normalizedRole = (role || '').toLowerCase();

  if (normalizedRole === 'admin') return '/admin-dashboard';
  if (normalizedRole === 'librarian') return '/librarian-dashboard';
  return '/student-dashboard';
};
