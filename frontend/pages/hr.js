import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function HRPage() {
    const { t } = useTranslation();
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
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>{t('HR')}</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                    <h3>{t('Users')}</h3>
                    <table style={{width: '100%'}}>
                        <thead><tr><th>{t('Username')}</th><th>{t('Email')}</th><th>{t('Role')}</th></tr></thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}><td>{user.username}</td><td>{user.email}</td><td>{user.role}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                    <h3>{t('Leave_Requests')}</h3>
                    {leaveRequests.length > 0 ? (
                        <table style={{width: '100%'}}>
                            <thead><tr><th>{t('ID')}</th><th>{t('Employee ID')}</th><th>{t('Dates')}</th><th>{t('Status')}</th><th>{t('Actions')}</th></tr></thead>
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
                                                    <button onClick={() => handleUpdateRequestStatus(req.id, 'approved')}>{t('Approve')}</button>
                                                    <button onClick={() => handleUpdateRequestStatus(req.id, 'rejected')}>{t('Reject')}</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p>{t('No_leave_requests_found')}</p>}
                </div>
            </main>
        </div>
    );
}
