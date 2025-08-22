import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function ProfilePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Form state for new leave request
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const hrApiUrl = process.env.NEXT_PUBLIC_HR_API_URL || 'http://localhost:8004';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchProfile(token);
        fetchLeaveRequests(token);
        setIsLoading(false);
    }, [router]);

    const fetchProfile = async (token) => {
        try {
            const res = await axios.get(`${hrApiUrl}/employees/me`, { headers: { Authorization: `Bearer ${token}` } });
            setProfile(res.data);
        } catch (error) { setMessage('Could not load employee profile.'); }
    };

    const fetchLeaveRequests = async (token) => {
        try {
            const res = await axios.get(`${hrApiUrl}/leave-requests/me`, { headers: { Authorization: `Bearer ${token}` } });
            setLeaveRequests(res.data);
        } catch (error) { setLeaveRequests([]); }
    };

    const handleCreateLeaveRequest = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${hrApiUrl}/leave-requests/`,
                { start_date: startDate, end_date: endDate, reason: reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Leave request submitted successfully!');
            setStartDate('');
            setEndDate('');
            setReason('');
            fetchLeaveRequests(token);
        } catch (error) { setMessage('Failed to submit leave request.'); }
    };

    if (isLoading) return <div className={styles.container}><Navbar /><p>Loading...</p></div>;

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>My Profile & Leave</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>My Profile</h3>
                        {profile ? (
                            <div>
                                <p><strong>Name:</strong> {profile.full_name}</p>
                                <p><strong>Job Title:</strong> {profile.job_title}</p>
                                <p><strong>Salary:</strong> ${profile.salary}</p>
                                <p><strong>Hire Date:</strong> {new Date(profile.hire_date).toLocaleDateString()}</p>
                            </div>
                        ) : <p>No employee profile found.</p>}
                    </div>

                    <div className={styles.card}>
                        <h3>New Leave Request</h3>
                        <form onSubmit={handleCreateLeaveRequest}>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for leave..." required></textarea>
                            <button type="submit">Submit Request</button>
                        </form>
                    </div>

                    <div className={styles.card} style={{width: '100%', maxWidth: '800px'}}>
                        <h3>My Leave Requests</h3>
                        {leaveRequests.length > 0 ? (
                            <table style={{width: '100%'}}>
                                <thead><tr><th>Start Date</th><th>End Date</th><th>Reason</th><th>Status</th></tr></thead>
                                <tbody>
                                    {leaveRequests.map(req => (
                                        <tr key={req.id}>
                                            <td>{new Date(req.start_date).toLocaleDateString()}</td>
                                            <td>{new Date(req.end_date).toLocaleDateString()}</td>
                                            <td>{req.reason}</td>
                                            <td>{req.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p>You have no leave requests.</p>}
                    </div>
                </div>
            </main>
        </div>
    );
}
