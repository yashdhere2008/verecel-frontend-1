import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [issueStatusFilter, setIssueStatusFilter] = useState('all');

  const [creditEdit, setCreditEdit] = useState({ userId: '', credit: '', maxBooks: '' });
  const [actionMsg, setActionMsg] = useState('');

  // ── Data Loaders ────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const res = await API.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.warn('Failed to load admin stats:', err.message);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const params = {};
      if (userRoleFilter !== 'all') params.role = userRoleFilter;
      if (userSearch) params.search = userSearch;
      const res = await API.get('/api/admin/users', { params });
      if (Array.isArray(res.data)) setUsers(res.data);
    } catch (err) {
      console.warn('Failed to load users:', err.message);
    }
  }, [userRoleFilter, userSearch]);

  const loadIssues = useCallback(async () => {
    try {
      const params = issueStatusFilter !== 'all' ? { status: issueStatusFilter } : {};
      const res = await API.get('/api/admin/issues', { params });
      if (Array.isArray(res.data)) setIssues(res.data);
    } catch (err) {
      console.warn('Failed to load issues:', err.message);
    }
  }, [issueStatusFilter]);

  const loadBooks = useCallback(async () => {
    try {
      const res = await API.get('/api/books');
      if (Array.isArray(res.data)) setBooks(res.data);
    } catch (err) {
      console.warn('Failed to load books:', err.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadUsers(), loadIssues(), loadBooks()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'issues') loadIssues();
    if (activeTab === 'books') loadBooks();
    if (activeTab === 'dashboard') loadStats();
  }, [activeTab, userRoleFilter, issueStatusFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate('/'); };

  const handleRefreshIssues = async () => {
    setLoading(true);
    try {
      await loadIssues();
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBooks = async () => {
    setLoading(true);
    try {
      await loadBooks();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/api/admin/users/${userId}`);
      setActionMsg(`✅ User "${name}" deleted.`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      loadStats();
    } catch (err) {
      setActionMsg('⚠ ' + (err.response?.data?.message || 'Failed to delete user.'));
    }
  };

  const handleUpdateCredit = async (e) => {
    e.preventDefault();
    if (!creditEdit.userId) return;
    try {
      const res = await API.patch(`/api/admin/users/${creditEdit.userId}/credit`, {
        credit: Number(creditEdit.credit),
        maxBooks: Number(creditEdit.maxBooks),
      });
      setActionMsg(`✅ Credit updated for ${res.data?.user?.name}.`);
      setCreditEdit({ userId: '', credit: '', maxBooks: '' });
      loadUsers();
    } catch (err) {
      setActionMsg('⚠ ' + (err.response?.data?.message || 'Failed to update credit.'));
    }
  };

  const startCreditEdit = (u) => {
    setCreditEdit({ userId: u._id, credit: u.credit ?? 5, maxBooks: u.maxBooks ?? 5 });
    setActiveTab('credit');
  };

  return (
    <div className="dashboard-container dashboard-admin">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>🏛️ College Admin</h2>
        <div style={{ padding: '8px 0', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
          👤 {user?.name || user?.email || 'College Admin'}
        </div>

        <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>�️ Dashboard</a>
        <a className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👨‍🏫 Manage Users</a>
        <a className={activeTab === 'issues' ? 'active' : ''} onClick={() => setActiveTab('issues')}>📖 All Issues</a>
        <a className={activeTab === 'books' ? 'active' : ''} onClick={() => setActiveTab('books')}>📚 All Books</a>
        <a className="logout" onClick={handleLogout}>🚪 Logout</a>
      </div>

      {/* Main */}
      <div className="main">
        {loading && <div style={{ textAlign: 'center', padding: '50px' }}><h2>🔄 Loading...</h2></div>}

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && !loading && (
          <div>
            <h1>Admin Overview 🏛️</h1>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Logged in as <strong>{user?.name || user?.email || 'College Admin'}</strong></p>

            <div className="cards">
              <div className="card"><h3>Total Books</h3><h1>{stats?.totalBooks ?? '—'}</h1></div>
              <div className="card"><h3>Total Copies</h3><h1>{stats?.totalCopies ?? '—'}</h1></div>
              <div className="card"><h3>Available Copies</h3><h1>{stats?.availableCopies ?? '—'}</h1></div>
              <div className="card"><h3>Students</h3><h1>{stats?.totalStudents ?? '—'}</h1></div>
              <div className="card"><h3>Librarians</h3><h1>{stats?.totalLibrarians ?? '—'}</h1></div>
              <div className="card"><h3>Active Issues</h3><h1>{stats?.activeIssues ?? '—'}</h1></div>
              <div className="card"><h3>Total Fines Collected</h3><h1>₹{stats?.totalFine ?? 0}</h1></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div>
                <h2>👥 Recent Users</h2>
                <table>
                  <thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead>
                  <tbody>
                    {users.slice(0, 8).map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'librarian' ? 'badge-yellow' : 'badge-blue'}`}>{u.role}</span></td>
                        <td>{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h2>📖 Recent Issues</h2>
                <table>
                  <thead><tr><th>Student</th><th>Book</th><th>Status</th></tr></thead>
                  <tbody>
                    {issues.slice(0, 8).map(issue => (
                      <tr key={issue._id}>
                        <td>{issue.student?.name || '—'}</td>
                        <td>{issue.book?.title || '—'}</td>
                        <td><span className={`badge ${issue.status === 'Overdue' ? 'badge-red' : 'badge-green'}`}>{issue.status}</span></td>
                      </tr>
                    ))}
                    {issues.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No active issues.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── MANAGE USERS ── */}
        {activeTab === 'users' && (
          <div>
            <h1>👨‍🏫 Manage Users</h1>
            {actionMsg && <div style={{ color: actionMsg.startsWith('⚠') ? 'red' : 'green', marginBottom: '12px', fontWeight: 'bold' }}>{actionMsg}</div>}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="🔍 Search name or email..."
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="librarian">Librarians</option>
                <option value="admin">Admins</option>
              </select>
              <button type="button" onClick={loadUsers} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🔄 Refresh</button>
            </div>

            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Roll No</th><th>Credit</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'librarian' ? 'badge-yellow' : 'badge-blue'}`}>{u.role}</span></td>
                    <td>{u.rollNo || '—'}</td>
                    <td>{u.role === 'student' ? `${u.credit ?? '?'}/${u.maxBooks ?? '?'}` : '—'}</td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {u.role === 'student' && (
                        <button onClick={() => startCreditEdit(u)} style={{ marginRight: '6px', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Edit Credit</button>
                      )}
                      <button className="reject" onClick={() => handleDeleteUser(u._id, u.name)}
                        style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── EDIT CREDIT ── */}
        {activeTab === 'credit' && (
          <div>
            <h1>Edit Student Credit</h1>
            <form onSubmit={handleUpdateCredit} style={{ maxWidth: '400px', margin: '0 auto' }}>
              <div className="form-group">
                <label>Current Credit (available borrows)</label>
                <input type="number" min="0" value={creditEdit.credit}
                  onChange={e => setCreditEdit(p => ({ ...p, credit: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Max Books Allowed</label>
                <input type="number" min="1" value={creditEdit.maxBooks}
                  onChange={e => setCreditEdit(p => ({ ...p, maxBooks: e.target.value }))} required />
              </div>
              {actionMsg && <div style={{ color: actionMsg.startsWith('⚠') ? 'red' : 'green', marginBottom: '12px' }}>{actionMsg}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Save Changes</button>
                <button type="button" onClick={() => { setActiveTab('users'); setActionMsg(''); }}
                  style={{ padding: '10px 20px', cursor: 'pointer', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── ALL ISSUES ── */}
        {activeTab === 'issues' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h1>📖 All Book Issues</h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={issueStatusFilter} onChange={e => setIssueStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Returned">Returned</option>
                </select>
                <button type="button" onClick={handleRefreshIssues} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🔄 Refresh</button>
              </div>
            </div>

            <table>
              <thead>
                <tr><th>Student</th><th>Roll No</th><th>Book</th><th>Semester</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Fine</th><th>Status</th></tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id}>
                    <td>{issue.student?.name || '—'}</td>
                    <td>{issue.student?.rollNo || '—'}</td>
                    <td>{issue.book?.title || '—'}</td>
                    <td>Sem {issue.book?.semester || '—'}</td>
                    <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '—'}</td>
                    <td>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</td>
                    <td>{issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : '—'}</td>
                    <td>{issue.fine ? `₹${issue.fine}` : '—'}</td>
                    <td><span className={`badge ${issue.status === 'Overdue' ? 'badge-red' : issue.status === 'Returned' ? 'badge-green' : 'badge-blue'}`}>{issue.status}</span></td>
                  </tr>
                ))}
                {issues.length === 0 && <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No issues found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ALL BOOKS ── */}
        {activeTab === 'books' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1>📚 All Books</h1>
              <button type="button" onClick={handleRefreshBooks} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🔄 Refresh</button>
            </div>
            <table>
              <thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Semester</th><th>Total</th><th>Available</th></tr></thead>
              <tbody>
                {books.map(b => (
                  <tr key={b._id}>
                    <td>{b.title}</td><td>{b.author}</td><td>{b.isbn}</td>
                    <td>{b.category}</td><td>Sem {b.semester}</td>
                    <td>{b.totalCopies}</td><td>{b.availableCopies}</td>
                  </tr>
                ))}
                {books.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No books found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;