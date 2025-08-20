import { useState } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function AuthPage() {
  // State for register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('engineer'); // Default role

  // State for login form
  const [logUsername, setLogUsername] = useState('');
  const [logPassword, setLogPassword] = useState('');

  // State for feedback
  const [message, setMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await axios.post(`${apiUrl}/users/`, {
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });
      setMessage(`User ${response.data.username} created successfully! Please log in.`);
    } catch (error) {
      setMessage(`Registration failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    const formData = new URLSearchParams();
    formData.append('username', logUsername);
    formData.append('password', logPassword);

    try {
      const response = await axios.post(`${apiUrl}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.access_token);
      }
      setMessage(`Login successful! Token stored.`);
    } catch (error) {
      setMessage(`Login failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.main}>
        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.grid}>
          {/* Registration Form */}
          <div className={styles.card}>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Username" required />
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="Email" required />
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Password" required />
              <select value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                <option value="engineer">Engineer</option>
                <option value="sales">Sales</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit">Register</button>
            </form>
          </div>

          {/* Login Form */}
          <div className={styles.card}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input type="text" value={logUsername} onChange={(e) => setLogUsername(e.target.value)} placeholder="Username" required />
              <input type="password" value={logPassword} onChange={(e) => setLogPassword(e.target.value)} placeholder="Password" required />
              <button type="submit">Login</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
