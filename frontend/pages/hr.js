import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function HRPage() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const authApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    const hrApiUrl = process.env.NEXT_PUBLIC_HR_API_URL || 'http://localhost:8004';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            if (decodedToken.role !== 'admin') {
                setMessage('Access Denied: Admins only.');
                setTimeout(() => router.push('/dashboard'), 3000);
                return;
            }
            fetchUsers(token);
            fetchLeaveRequests(token);
        } catch (error) {
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchUsers = async (token) => {
        try {
            const response = await axios.get(`${authApiUrl}/users/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            setMessage('Failed to fetch users.');
        }
    };

    const fetchLeaveRequests = async (token) => {
        try {
            const response = await axios.get(`${hrApiUrl}/leave-requests/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(response.data);
        } catch (error) {
            setLeaveRequests([]); // Assume no requests if fetch fails for now
        }
    };

    const handleUpdateRequestStatus = async (requestId, newStatus) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(
                `${hrApiUrl}/leave-requests/${requestId}/status?new_status=${newStatus}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(`Request ${requestId} has been ${newStatus}.`);
            fetchLeaveRequests(token); // Refresh list
        } catch (error) {
            setMessage('Failed to update leave request.');
        }
    };

    if (isLoading) {
        return <div className={styles.container}><p>Loading...</p></div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>Human Resources</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                    <h3>Users</h3>
                    <table style={{width: '100%'}}>
                        <thead><tr><th>Username</th><th>Email</th><th>Role</th></tr></thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}><td>{user.username}</td><td>{user.email}</td><td>{user.role}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                    <h3>Leave Requests</h3>
                    {leaveRequests.length > 0 ? (
                        <table style={{width: '100%'}}>
                            <thead><tr><th>ID</th><th>Employee ID</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {leaveRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.id}</td>
                                        <td>{req.employee_id}</td>
                                        <td>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                                        <td>{req.status}</td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleUpdateRequestStatus(req.id, 'approved')}>Approve</button>
                                                    <button onClick={() => handleUpdateRequestStatus(req.id, 'rejected')}>Reject</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p>No leave requests found.</p>}
                </div>
            </main>
        </div>
    );
}
