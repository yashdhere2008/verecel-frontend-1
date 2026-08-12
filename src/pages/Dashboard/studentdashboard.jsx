import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatQuery, setChatQuery] = useState('');
  const [chatMsg, setChatMsg] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [myBooksFilter, setMyBooksFilter] = useState('all');

  // DB States
  const [allBooks, setAllBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: '', reason: '' });
  const [requestMsg, setRequestMsg] = useState('');
  const [fineMsg, setFineMsg] = useState('');

  // Fetch student data
  const fetchStudentPersonalData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await API.get('/api/students/me');
      if (res && res.data) {
        setStudentProfile(res.data.student || null);
        setSummary(res.data.summary || null);
        const historyList = res.data.borrowingHistory || [];
        setHistory(historyList);
        setIssuedBooks(historyList.filter(item => item.status !== 'Returned'));
        setAllBooks(res.data.books || []);
      }
    } catch (error) {
      console.error('Error loading student dashboard data:', error);
      setStudentProfile(null); setSummary(null);
      setHistory([]); setIssuedBooks([]); setAllBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudentPersonalData(); }, [user, activeTab]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleNewBookRequest = (e) => {
    e.preventDefault();
    if (!requestForm.title.trim()) {
      setRequestMsg('⚠ Please enter a book title.');
      return;
    }
    setRequestMsg(`✅ Request sent for "${requestForm.title}". The librarian will review it soon.`);
    setRequestForm({ title: '', reason: '' });
  };

  const handlePayFineScan = () => {
    setFineMsg('✅ Fine payment scanner opened. Please scan your college ID at the library desk to continue.');
  };

  const handleChatSearch = () => {
    if (!chatQuery.trim()) { setChatMsg('⚠️ Please type a question first.'); return; }
    window.open('https://www.google.com/search?q=' + encodeURIComponent(chatQuery), '_blank');
    setChatQuery('');
  };

  const handleBorrowBook = async (book) => {
    try {
      await API.post(`/api/books/${book._id}/borrow`);
      alert(`✅ "${book.title}" has been borrowed successfully!`);
      fetchStudentPersonalData();
    } catch (error) {
      alert(`⚠️ ${error.response?.data?.message || 'Could not borrow book. Please try again.'}`);
    }
  };

  const handleRenewBook = async (issueId, bookTitle) => {
    try {
      const res = await API.patch(`/api/books/issue/${issueId}/renew`);
      alert(`✅ "${bookTitle}" renewed! ${res.data?.message || ''}`);
      fetchStudentPersonalData();
    } catch (error) {
      alert(`⚠️ ${error.response?.data?.message || 'Could not renew. Please contact librarian.'}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg('⚠ New passwords do not match.');
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdMsg('⚠ New password must be at least 6 characters.');
      return;
    }
    setPwdLoading(true);
    try {
      await API.post('/api/auth/change-password', {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdMsg('✅ Password changed successfully!');
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdMsg('⚠ ' + (err.response?.data?.message || 'Failed to change password.'));
    } finally {
      setPwdLoading(false);
    }
  };

  // Filters
  const filteredCatalogBooks = allBooks.filter((book) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = (
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query) ||
      book.category?.toLowerCase().includes(query) ||
      book.isbn?.toLowerCase().includes(query)
    );
    const matchesSemester = selectedSemester === 'all' || String(book.semester) === String(selectedSemester);
    return matchesSearch && matchesSemester;
  });

  const filteredMyBooks = history.filter((issue) => {
    if (myBooksFilter === 'all') return true;
    if (myBooksFilter === 'Active') return issue.status === 'Active' || issue.status === 'Issued';
    return issue.status === myBooksFilter;
  });

  const getStatusBadgeClass = (status) => {
    if (status === 'Returned') return 'badge-green';
    if (status === 'Overdue') return 'badge-red';
    return 'badge-blue';
  };

  return (
    <div className="dashboard-container student-dashboard-modern">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>🎓 Student</h2>

        <div style={{ padding: '8px 0', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0', marginBottom: '15px' }}>
          👤 <strong style={{ color: '#1e293b' }}>{studentProfile?.name || user?.name || 'Student'}</strong>
          {(studentProfile?.rollNo || user?.rollNo) && (
            <div>🆔 Roll No: <strong style={{ color: '#1e293b' }}>{studentProfile?.rollNo || user?.rollNo}</strong></div>
          )}
          {studentProfile && (
            <div style={{ marginTop: '5px' }}>
              📚 Credit: <strong style={{ color: '#2563eb' }}>{studentProfile.credit} / {studentProfile.maxBooks}</strong>
            </div>
          )}
        </div>

        <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>🏠 Dashboard</a>
        <a className={activeTab === 'mybooks' ? 'active' : ''} onClick={() => setActiveTab('mybooks')}>📖 My Issued Books</a>
        <a className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}>📚 Book Catalog</a>
        <a className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📜 My History</a>
        <a className={activeTab === 'requestbook' ? 'active' : ''} onClick={() => setActiveTab('requestbook')}>📩 Request New Book</a>
        <a className={activeTab === 'payfine' ? 'active' : ''} onClick={() => setActiveTab('payfine')}>💳 Pay Fine</a>
        <a className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>⚙️ Change Password</a>
        <a className="logout" onClick={handleLogout}>🚪 Logout</a>

        <div className="chat-box" style={{ marginTop: 'auto' }}>
          <h3>💬 Ask Anything</h3>
          <input type="text" placeholder="Type your question..." value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChatSearch()} />
          <button type="button" onClick={handleChatSearch}>🔍 Search Google</button>
          <div className="chat-msg">{chatMsg}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>🔄 Loading Dashboard Data...</h2>
          </div>
        ) : (
          <>
            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="student-welcome-banner">
                  <div className="student-welcome-copy">
                    <span className="banner-kicker">🎓 Student Portal</span>
                    <h1>Welcome back, {studentProfile?.name || user?.name || 'Student'}! 👋</h1>
                    <p className="banner-date">
                      📧 {studentProfile?.email || user?.email || 'N/A'}
                      {(studentProfile?.rollNo || user?.rollNo) && (
                        <span style={{ marginLeft: '16px' }}>🆔 Roll No: <strong>{studentProfile?.rollNo || user?.rollNo}</strong></span>
                      )}
                    </p>
                  </div>
                  <div className="welcome-actions">
                    <button className="primary-button" onClick={fetchStudentPersonalData}>🔄 Refresh</button>
                  </div>
                </div>

                <div className="summary-cards-grid">
                  <div className="summary-card">
                    <div className="summary-card-head"><div className="summary-icon" style={{ backgroundColor: '#eff6ff' }}>📖</div></div>
                    <div className="summary-title">Currently Issued</div>
                    <div className="summary-number">{issuedBooks.length}</div>
                    <div className="summary-description">Books to return</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-head"><div className="summary-icon" style={{ backgroundColor: '#fff6e0' }}>📜</div></div>
                    <div className="summary-title">Total History</div>
                    <div className="summary-number">{history.length}</div>
                    <div className="summary-description">Total books borrowed</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-head"><div className="summary-icon" style={{ backgroundColor: '#e8f7ee' }}>📚</div></div>
                    <div className="summary-title">Available Credit</div>
                    <div className="summary-number">{studentProfile?.credit ?? 0} / {studentProfile?.maxBooks ?? 5}</div>
                    <div className="summary-description">Borrow slots remaining</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-head"><div className="summary-icon" style={{ backgroundColor: '#ffecec' }}>💵</div></div>
                    <div className="summary-title">Outstanding Fine</div>
                    <div className="summary-number">₹{summary?.fine || 0}</div>
                    <div className="summary-description">Due fines</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-head"><div className="summary-icon" style={{ backgroundColor: '#f5f9ff' }}>🏢</div></div>
                    <div className="summary-title">Total Catalog</div>
                    <div className="summary-number">{allBooks.length}</div>
                    <div className="summary-description">Books in library</div>
                  </div>
                </div>

                <h2>📖 Currently Issued Books</h2>
                <div className="table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr><th>Title</th><th>Author</th><th>Issue Date</th><th>Due Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {issuedBooks.map((item) => (
                        <tr key={item._id}>
                          <td><div className="book-name-cell"><span className="book-cover-mini">📘</span><strong>{item.book?.title}</strong></div></td>
                          <td>{item.book?.author}</td>
                          <td>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : '-'}</td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                          <td><span className={`badge ${item.status === 'Overdue' ? 'badge-red' : 'badge-green'}`}>{item.status || 'Active'}</span></td>
                        </tr>
                      ))}
                      {issuedBooks.length === 0 && (
                        <tr><td colSpan="5" className="empty-state" style={{ textAlign: 'center' }}>No books currently issued.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── MY ISSUED BOOKS TAB ── */}
            {activeTab === 'mybooks' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Personal Library</span>
                    <h2>📖 My Book Transactions</h2>
                  </div>
                  <div className="table-tools">
                    <select value={myBooksFilter} onChange={(e) => setMyBooksFilter(e.target.value)}>
                      <option value="all">All Transactions</option>
                      <option value="Active">Active</option>
                      <option value="Returned">Returned</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <button onClick={fetchStudentPersonalData}>🔄 Refresh</button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr><th>Title</th><th>Author</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Fine</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {filteredMyBooks.map((item) => (
                        <tr key={item._id}>
                          <td><div className="book-name-cell"><span className="book-cover-mini">📘</span><strong>{item.book?.title}</strong></div></td>
                          <td>{item.book?.author}</td>
                          <td>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : '-'}</td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                          <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : '-'}</td>
                          <td>₹{item.fine || 0}</td>
                          <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                          <td>
                            {item.status !== 'Returned' && (
                              <button onClick={() => handleRenewBook(item._id, item.book?.title)}
                                style={{ padding: '5px 10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                🔄 Renew
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredMyBooks.length === 0 && (
                        <tr><td colSpan="8" className="empty-state" style={{ textAlign: 'center' }}>No matching book transactions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── BOOK CATALOG TAB ── */}
            {activeTab === 'catalog' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Library Collection</span>
                    <h2>📚 Browse Catalog</h2>
                  </div>
                  <div className="table-tools">
                    <div className="search-box">
                      🔍 <input type="text" placeholder="Search title, author, category..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={{ width: '160px' }}>
                      <option value="all">All Semesters</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                    </select>
                    <button onClick={fetchStudentPersonalData}>🔄 Refresh</button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr><th>Title</th><th>Author</th><th>Category / Dept</th><th>Semester</th><th>Available Copies</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {filteredCatalogBooks.map((book) => {
                        const copies = book.availableCopies ?? book.totalCopies ?? 0;
                        const canBorrow = copies > 0 && studentProfile && studentProfile.credit > 0;
                        return (
                          <tr key={book._id}>
                            <td><div className="book-name-cell"><span className="book-cover-mini">📖</span><strong>{book.title}</strong></div></td>
                            <td>{book.author}</td>
                            <td>{book.category || 'General'}</td>
                            <td>Sem {book.semester}</td>
                            <td>{copies} / {book.totalCopies}</td>
                            <td>
                              <button className="borrow-button" onClick={() => handleBorrowBook(book)} disabled={!canBorrow}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: canBorrow ? '#2563eb' : '#cbd5e1',
                                  color: '#fff', border: 'none', borderRadius: '8px',
                                  cursor: canBorrow ? 'pointer' : 'not-allowed', width: 'auto', marginTop: 0
                                }}>
                                {copies <= 0 ? 'Out of Stock' : studentProfile && studentProfile.credit <= 0 ? 'No Credit' : '📖 Borrow'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCatalogBooks.length === 0 && (
                        <tr><td colSpan="6" className="empty-state" style={{ textAlign: 'center' }}>No books match the search/filter criteria.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── MY HISTORY TAB ── */}
            {activeTab === 'history' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Activity Log</span>
                    <h2>📜 My Borrowing History</h2>
                  </div>
                  <button onClick={fetchStudentPersonalData}>🔄 Refresh</button>
                </div>

                <div className="table-wrapper">
                  <table className="student-table">
                    <thead>
                      <tr><th>Title</th><th>Author</th><th>Category</th><th>Borrow Date</th><th>Due Date</th><th>Return Date</th><th>Fine</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item._id}>
                          <td><div className="book-name-cell"><span className="book-cover-mini">📘</span><strong>{item.book?.title}</strong></div></td>
                          <td>{item.book?.author}</td>
                          <td>{item.book?.category || 'General'}</td>
                          <td>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : '-'}</td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                          <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : '-'}</td>
                          <td>₹{item.fine || 0}</td>
                          <td><span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span></td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr><td colSpan="8" className="empty-state" style={{ textAlign: 'center' }}>No transaction history available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REQUEST NEW BOOK TAB ── */}
            {activeTab === 'requestbook' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Library Request</span>
                    <h2>📩 Request a New Book</h2>
                  </div>
                </div>

                <form onSubmit={handleNewBookRequest} style={{ maxWidth: '480px', marginTop: '24px' }}>
                  <div className="form-group">
                    <label>Book Title</label>
                    <input type="text" value={requestForm.title} onChange={(e) => setRequestForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter the book title" />
                  </div>
                  <div className="form-group">
                    <label>Reason / Notes</label>
                    <textarea rows="4" value={requestForm.reason} onChange={(e) => setRequestForm(p => ({ ...p, reason: e.target.value }))} placeholder="Why do you need this book?" />
                  </div>
                  {requestMsg && <div style={{ margin: '12px 0', fontWeight: 'bold', color: requestMsg.startsWith('⚠') ? '#ef4444' : '#16a34a' }}>{requestMsg}</div>}
                  <button type="submit" style={{ padding: '10px 24px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Send Request</button>
                </form>
              </div>
            )}

            {/* ── PAY FINE TAB ── */}
            {activeTab === 'payfine' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Payments</span>
                    <h2>💳 Pay Fine</h2>
                  </div>
                </div>

                <div style={{ maxWidth: '480px', marginTop: '24px' }}>
                  <p style={{ color: '#64748b', marginBottom: '12px' }}>Use the college scanner at the library desk to complete your fine payment.</p>
                  <button onClick={handlePayFineScan} style={{ padding: '10px 24px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Open College Scanner</button>
                  {fineMsg && <div style={{ marginTop: '12px', fontWeight: 'bold', color: '#16a34a' }}>{fineMsg}</div>}
                </div>
              </div>
            )}

            {/* ── CHANGE PASSWORD TAB ── */}
            {activeTab === 'settings' && (
              <div className="student-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">Account Security</span>
                    <h2>⚙️ Change Password</h2>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} style={{ maxWidth: '440px', marginTop: '24px' }}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" value={pwdForm.oldPassword} required
                      onChange={e => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                      placeholder="Enter your current password" />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" value={pwdForm.newPassword} required minLength={6}
                      onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="At least 6 characters" />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={pwdForm.confirmPassword} required
                      onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password" />
                  </div>

                  {pwdMsg && (
                    <div style={{ margin: '12px 0', fontWeight: 'bold', color: pwdMsg.startsWith('⚠') ? '#ef4444' : '#16a34a' }}>
                      {pwdMsg}
                    </div>
                  )}

                  <button type="submit" disabled={pwdLoading}
                    style={{ padding: '10px 24px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>
                    {pwdLoading ? 'Updating...' : '🔒 Change Password'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;