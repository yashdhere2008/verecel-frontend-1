import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

const LibrarianDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatQuery, setChatQuery] = useState('');
  const [chatMsg, setChatMsg] = useState('');

  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookSemFilter, setBookSemFilter] = useState('all');

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  const [bookForm, setBookForm] = useState({
    title: '', author: '', isbn: '', category: '', semester: 1, totalCopies: 1,
  });
  const [editingBookId, setEditingBookId] = useState('');
  const [bookFormError, setBookFormError] = useState('');
  const [bookFormSuccess, setBookFormSuccess] = useState('');
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', rollNo: '' });
  const [studentFormMsg, setStudentFormMsg] = useState('');
  const [studentFormLoading, setStudentFormLoading] = useState(false);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadBooks = useCallback(async () => {
    try {
      const res = await API.get('/api/books');
      if (Array.isArray(res.data)) setBooks(res.data);
    } catch (err) {
      console.warn('Failed to load books:', err.message);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await API.get('/api/students');
      if (Array.isArray(res.data)) setStudents(res.data);
    } catch (err) {
      console.warn('Failed to load students:', err.message);
    }
  }, []);

  const loadActiveIssues = useCallback(async () => {
    try {
      const res = await API.get('/api/books/active-issues');
      if (Array.isArray(res.data)) setActiveIssues(res.data);
    } catch (err) {
      console.warn('Failed to load active issues:', err.message);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadBooks(), loadStudents(), loadActiveIssues()]);
    setLoading(false);
  }, [loadBooks, loadStudents, loadActiveIssues]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload active issues whenever switching to return/requests tab
  useEffect(() => {
    if (activeTab === 'return' || activeTab === 'requests') {
      loadActiveIssues();
    }
    if (activeTab === 'books') {
      loadBooks();
    }
  }, [activeTab]);

  // ── Computed stats ───────────────────────────────────────────────────────────
  const totalIssuedCopies = useMemo(() =>
    books.reduce((s, b) => s + Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)), 0), [books]);
  const totalAvailableCopies = useMemo(() =>
    books.reduce((s, b) => s + (b.availableCopies || 0), 0), [books]);
  const totalCopies = useMemo(() =>
    books.reduce((s, b) => s + (b.totalCopies || 0), 0), [books]);

  // ── Filtered books ───────────────────────────────────────────────────────────
  const filteredBooks = useMemo(() => {
    const q = bookSearch.toLowerCase();
    return books.filter(b => {
      const matchesText = !q ||
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q);
      const matchesSem = bookSemFilter === 'all' || String(b.semester) === bookSemFilter;
      return matchesText && matchesSem;
    });
  }, [books, bookSearch, bookSemFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate('/'); };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setStudentFormMsg('');
    if (!studentForm.name || !studentForm.email || !studentForm.password || !studentForm.rollNo) {
      setStudentFormMsg('⚠ Please fill all student details.');
      return;
    }
    setStudentFormLoading(true);
    try {
      await API.post('/api/auth/register', {
        name: studentForm.name,
        email: studentForm.email,
        password: studentForm.password,
        role: 'student',
        rollNo: studentForm.rollNo,
      });
      setStudentFormMsg('✅ Student registered successfully.');
      setStudentForm({ name: '', email: '', password: '', rollNo: '' });
      await loadStudents();
    } catch (err) {
      setStudentFormMsg('⚠ ' + (err.response?.data?.message || 'Failed to register student.'));
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleBookInput = (e) => {
    const { name, value } = e.target;
    setBookForm(prev => ({ ...prev, [name]: name === 'semester' || name === 'totalCopies' ? Number(value) : value }));
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    setBookFormError(''); setBookFormSuccess('');
    if (!bookForm.title || !bookForm.author) { setBookFormError('Title and Author are required.'); return; }

    const payload = {
      title: bookForm.title, author: bookForm.author,
      isbn: bookForm.isbn.trim() || `ISBN-${Date.now()}`,
      category: bookForm.category || 'General',
      semester: Number(bookForm.semester) || 1,
      totalCopies: Number(bookForm.totalCopies) || 1,
      availableCopies: Number(bookForm.totalCopies) || 1,
    };
    try {
      const res = await API.post('/api/books', payload);
      const saved = res.data?.book || res.data || { ...payload, _id: `b-${Date.now()}` };
      setBooks(prev => [...prev, saved]);
      setBookFormSuccess('✅ Book added successfully.');
      setBookForm({ title: '', author: '', isbn: '', category: '', semester: 1, totalCopies: 1 });
    } catch (err) {
      setBookFormError('⚠ ' + (err.response?.data?.message || 'Failed to add book.'));
    }
  };

  const handleEditBook = (book) => {
    setEditingBookId(book._id);
    setBookForm({ title: book.title, author: book.author, isbn: book.isbn || '', category: book.category || 'General', semester: Number(book.semester || 1), totalCopies: Number(book.totalCopies || 1) });
    setActiveTab('addbook');
    setBookFormError(''); setBookFormSuccess('');
  };

  const handleUpdateBook = async (e) => {
    e.preventDefault();
    if (!editingBookId) return;
    setBookFormError(''); setBookFormSuccess('');
    const updatedData = {
      title: bookForm.title, author: bookForm.author,
      isbn: bookForm.isbn || `ISBN-${Date.now()}`,
      category: bookForm.category || 'General',
      semester: Number(bookForm.semester || 1),
      totalCopies: Number(bookForm.totalCopies || 1),
    };
    try {
      await API.put(`/api/books/${editingBookId}`, updatedData);
    } catch (err) {
      console.warn('Backend update failed, applying locally:', err.message);
    }
    setBooks(prev => prev.map(b => b._id === editingBookId ? { ...b, ...updatedData } : b));
    setBookFormSuccess('✅ Book updated successfully.');
    setBookForm({ title: '', author: '', isbn: '', category: '', semester: 1, totalCopies: 1 });
    setEditingBookId('');
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Delete this book from the library?')) return;
    try {
      await API.delete(`/api/books/${bookId}`);
    } catch (err) {
      console.warn('Delete failed:', err.message);
    }
    setBooks(prev => prev.filter(b => b._id !== bookId));
    setBookFormSuccess('✅ Book deleted.');
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    setIssueError(''); setIssueSuccess('');
    if (!selectedStudentId || !selectedBookId) {
      setIssueError('⚠ Please select both a student and a book.');
      return;
    }
    const book = books.find(b => String(b._id) === String(selectedBookId));
    if (book && book.availableCopies <= 0) {
      setIssueError('⚠ No copies available for this book.');
      return;
    }
    try {
      await API.post(`/api/books/${selectedBookId}/issue`, { studentId: selectedStudentId, dueDate: dueDate || undefined });
      setIssueSuccess(`✅ Book "${book?.title}" issued successfully.`);
      setDueDate('');
      setSelectedBookId('');
      await loadBooks();
      await loadActiveIssues();
    } catch (err) {
      setIssueError('⚠ ' + (err.response?.data?.message || 'Failed to issue book.'));
    }
  };

  const handleReturnIssue = async (issueId) => {
    try {
      const res = await API.patch(`/api/books/issue/${issueId}/return`, { returnDate: new Date().toISOString() });
      const fine = res.data?.fine;
      const msg = fine && fine > 0 ? `✅ Book returned. Fine collected: ₹${fine}` : '✅ Book returned successfully.';
      setIssueSuccess(msg);
      await loadActiveIssues();
      await loadBooks();
    } catch (err) {
      setIssueError('⚠ ' + (err.response?.data?.message || 'Failed to return book.'));
    }
  };

  const handleRenewIssue = async (issueId) => {
    try {
      const res = await API.patch(`/api/books/issue/${issueId}/renew`);
      setIssueSuccess('✅ ' + (res.data?.message || 'Issue renewed.'));
      await loadActiveIssues();
    } catch (err) {
      setIssueError('⚠ ' + (err.response?.data?.message || 'Failed to renew issue.'));
    }
  };

  const handleChatSearch = () => {
    if (!chatQuery.trim()) { setChatMsg('⚠️ Type a question first.'); return; }
    window.open('https://www.google.com/search?q=' + encodeURIComponent(chatQuery), '_blank');
    setChatQuery('');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>👩‍🏫 Librarian</h2>
        <div style={{ padding: '8px 0', fontSize: '13px', color: '#ccc', borderBottom: '1px solid #334155', marginBottom: '12px' }}>
          👤 {user?.name || user?.email || 'Librarian'}
        </div>

        <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>🏠 Dashboard</a>
        <a className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>👨‍🎓 Students</a>
        <a className={activeTab === 'registerstudent' ? 'active' : ''} onClick={() => setActiveTab('registerstudent')}>📝 Register Student</a>
        <a className={activeTab === 'books' ? 'active' : ''} onClick={() => setActiveTab('books')}>📚 Manage Books</a>
        <a className={activeTab === 'addbook' ? 'active' : ''} onClick={() => setActiveTab('addbook')}>➕ Add Book</a>
        <a className={activeTab === 'issue' ? 'active' : ''} onClick={() => setActiveTab('issue')}>📖 Issue Books</a>
        <a className={activeTab === 'return' ? 'active' : ''} onClick={() => setActiveTab('return')}>📥 Return Books</a>
        <a className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>📋 All Requests</a>
        <a className="logout" onClick={handleLogout}>🚪 Logout</a>

        <div className="chat-box">
          <h3>💬 Ask Anything</h3>
          <input type="text" placeholder="Type your question..." value={chatQuery}
            onChange={e => setChatQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSearch()} />
          <button onClick={handleChatSearch}>🔍 Search Google</button>
          <div className="chat-msg">{chatMsg}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">
        {loading && activeTab === 'dashboard' && (
          <div style={{ textAlign: 'center', padding: '50px' }}><h2>🔄 Loading...</h2></div>
        )}

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && !loading && (
          <div>
            <h1 style={{ fontSize: '22px' }}>Welcome back, {user?.name || 'Librarian'}! 👋</h1>
            <p style={{ color: '#666', marginBottom: '15px', fontSize: '13px' }}>Account: <strong>{user?.email}</strong></p>

            <div className="cards">
              <div className="card"><h3>Total Books</h3><h1>{books.length}</h1></div>
              <div className="card"><h3>Total Copies</h3><h1>{totalCopies}</h1></div>
              <div className="card"><h3>Issued Copies</h3><h1>{totalIssuedCopies}</h1></div>
              <div className="card"><h3>Available Copies</h3><h1>{totalAvailableCopies}</h1></div>
              <div className="card"><h3>Students</h3><h1>{students.length}</h1></div>
              <div className="card"><h3>Active Issues</h3><h1>{activeIssues.length}</h1></div>
            </div>

            <h2>📚 Recent Books</h2>
            <table>
              <thead><tr><th>Title</th><th>Author</th><th>Semester</th><th>Category</th><th>Available</th></tr></thead>
              <tbody>
                {books.slice(0, 10).map(book => (
                  <tr key={book._id}>
                    <td>{book.title}</td><td>{book.author}</td>
                    <td>Sem {book.semester || 'N/A'}</td>
                    <td>{book.category || 'General'}</td>
                    <td>{book.availableCopies || 0}/{book.totalCopies || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>👨‍🎓 Registered Students</h2>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Roll No</th><th>Credit</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id}>
                    <td>{s.name}</td><td>{s.email}</td>
                    <td>{s.rollNo || '—'}</td>
                    <td>{s.credit ?? '—'}/{s.maxBooks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {activeTab === 'students' && (
          <div>
            <h1>👨‍🎓 Students</h1>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Roll No</th><th>Credit</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id}>
                    <td>{s.name}</td><td>{s.email}</td>
                    <td>{s.rollNo || '—'}</td>
                    <td>{s.credit ?? '—'}/{s.maxBooks ?? '—'}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'registerstudent' && (
          <div>
            <h1>📝 Register Student</h1>
            <form onSubmit={handleRegisterStudent} style={{ maxWidth: '450px', marginTop: '12px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={studentForm.name} onChange={(e) => setStudentForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter student name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={studentForm.email} onChange={(e) => setStudentForm(p => ({ ...p, email: e.target.value }))} placeholder="student@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={studentForm.password} onChange={(e) => setStudentForm(p => ({ ...p, password: e.target.value }))} placeholder="Create password" />
              </div>
              <div className="form-group">
                <label>Roll Number</label>
                <input type="text" value={studentForm.rollNo} onChange={(e) => setStudentForm(p => ({ ...p, rollNo: e.target.value }))} placeholder="Enter roll number" />
              </div>
              {studentFormMsg && <div style={{ marginBottom: '10px', color: studentFormMsg.startsWith('⚠') ? '#b91c1c' : '#166534' }}>{studentFormMsg}</div>}
              <button type="submit" disabled={studentFormLoading}>{studentFormLoading ? 'Registering...' : 'Register Student'}</button>
            </form>
          </div>
        )}

        {/* ── MANAGE BOOKS ── */}
        {activeTab === 'books' && (
          <div>
            <h1>Manage Books</h1>
            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="🔍 Search title, author, ISBN, category..."
                value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <select value={bookSemFilter} onChange={e => setBookSemFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <option value="all">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
              </select>
              <button onClick={loadBooks} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>🔄 Refresh</button>
            </div>

            <table>
              <thead><tr><th>Book</th><th>Author</th><th>Semester</th><th>Category</th><th>Available</th><th>Action</th></tr></thead>
              <tbody>
                {filteredBooks.map(book => (
                  <tr key={book._id}>
                    <td>{book.title}</td><td>{book.author}</td>
                    <td>Sem {book.semester || 'N/A'}</td>
                    <td>{book.category || 'General'}</td>
                    <td>{book.availableCopies || 0}/{book.totalCopies || 0}</td>
                    <td>
                      <button onClick={() => handleEditBook(book)} style={{ marginRight: '8px' }}>Edit</button>
                      <button className="reject" onClick={() => handleDeleteBook(book._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredBooks.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No books match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ADD / EDIT BOOK ── */}
        {activeTab === 'addbook' && (
          <div>
            <h1>{editingBookId ? 'Edit Book' : 'Add New Book'}</h1>
            <form onSubmit={editingBookId ? handleUpdateBook : handleAddBook} style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="form-group"><label>Book Title *</label>
                <input name="title" type="text" value={bookForm.title} onChange={handleBookInput} required />
              </div>
              <div className="form-group"><label>Author *</label>
                <input name="author" type="text" value={bookForm.author} onChange={handleBookInput} required />
              </div>
              <div className="form-group"><label>ISBN (Optional)</label>
                <input name="isbn" type="text" value={bookForm.isbn} onChange={handleBookInput} placeholder="e.g. 978-3-16-148410-0" />
              </div>
              <div className="form-group"><label>Category</label>
                <input name="category" type="text" value={bookForm.category} onChange={handleBookInput} placeholder="e.g. Computer Science" />
              </div>
              <div className="form-group"><label>Semester</label>
                <select name="semester" value={bookForm.semester} onChange={handleBookInput}>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Total Copies</label>
                <input name="totalCopies" type="number" min="1" value={bookForm.totalCopies} onChange={handleBookInput} required />
              </div>

              {bookFormError && <div style={{ color: 'red', margin: '10px 0' }}>{bookFormError}</div>}
              {bookFormSuccess && <div style={{ color: 'green', margin: '10px 0' }}>{bookFormSuccess}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                  {editingBookId ? 'Update Book' : 'Save Book'}
                </button>
                {editingBookId && (
                  <button type="button" onClick={() => { setEditingBookId(''); setBookForm({ title: '', author: '', isbn: '', category: '', semester: 1, totalCopies: 1 }); }}
                    style={{ padding: '10px 20px', cursor: 'pointer', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px' }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── ISSUE BOOKS ── */}
        {activeTab === 'issue' && (
          <div>
            <h1>Issue Books</h1>
            <form onSubmit={handleIssueBook} style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div className="form-group">
                <label>Student</label>
                <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>{s.name} — {s.rollNo || s.email} (Credit: {s.credit ?? '?'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Book</label>
                <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)}>
                  <option value="">Select a book</option>
                  {books.map(b => (
                    <option key={b._id} value={b._id} disabled={b.availableCopies <= 0}>
                      {b.title} — Sem {b.semester} — {b.availableCopies || 0} available
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due Date (optional — defaults to 14 days)</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>

              {issueError && <div style={{ color: 'red', margin: '10px 0' }}>{issueError}</div>}
              {issueSuccess && <div style={{ color: 'green', margin: '10px 0' }}>{issueSuccess}</div>}

              <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Issue Book</button>
            </form>
          </div>
        )}

        {/* ── RETURN BOOKS ── */}
        {activeTab === 'return' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1>Return Books</h1>
              <button onClick={loadActiveIssues} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>🔄 Refresh</button>
            </div>

            {issueError && <div style={{ color: 'red', margin: '10px 0' }}>{issueError}</div>}
            {issueSuccess && <div style={{ color: 'green', margin: '10px 0' }}>{issueSuccess}</div>}

            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Roll No</th><th>Book</th><th>Issue Date</th>
                  <th>Due Date</th><th>Status</th><th>Est. Fine</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeIssues.map(issue => {
                  const overdueDays = issue.dueDate && new Date() > new Date(issue.dueDate)
                    ? Math.ceil((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
                  const estFine = overdueDays * 5;
                  return (
                    <tr key={issue._id}>
                      <td>{issue.student?.name || '—'}</td>
                      <td>{issue.student?.rollNo || '—'}</td>
                      <td>{issue.book?.title || '—'}</td>
                      <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '—'}</td>
                      <td>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge ${issue.status === 'Overdue' ? 'badge-red' : 'badge-green'}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td>{estFine > 0 ? `₹${estFine}` : '—'}</td>
                      <td>
                        <button onClick={() => handleReturnIssue(issue._id)} style={{ marginRight: '6px' }}>Return</button>
                        <button onClick={() => handleRenewIssue(issue._id)}
                          style={{ padding: '6px 10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                          Renew
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {activeIssues.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No active issue records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ALL REQUESTS ── */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1>All Active Requests</h1>
              <button onClick={loadActiveIssues} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>🔄 Refresh</button>
            </div>
            <p style={{ color: '#666', marginBottom: '12px' }}>All currently Active and Overdue book issues from the database.</p>

            {issueError && <div style={{ color: 'red', margin: '10px 0' }}>{issueError}</div>}
            {issueSuccess && <div style={{ color: 'green', margin: '10px 0' }}>{issueSuccess}</div>}

            <table>
              <thead>
                <tr><th>Student</th><th>Roll No</th><th>Book</th><th>Sem</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {activeIssues.map(issue => (
                  <tr key={issue._id}>
                    <td>{issue.student?.name || '—'}</td>
                    <td>{issue.student?.rollNo || '—'}</td>
                    <td>{issue.book?.title || '—'}</td>
                    <td>Sem {issue.book?.semester || '—'}</td>
                    <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '—'}</td>
                    <td>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`badge ${issue.status === 'Overdue' ? 'badge-red' : 'badge-green'}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleReturnIssue(issue._id)} style={{ marginRight: '6px' }}>Mark Returned</button>
                    </td>
                  </tr>
                ))}
                {activeIssues.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No pending requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianDashboard;