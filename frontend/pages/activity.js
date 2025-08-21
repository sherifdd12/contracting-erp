import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function ActivityPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [activities, setActivities] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const activityApiUrl = process.env.NEXT_PUBLIC_ACTIVITY_API_URL || 'http://localhost:8008';

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
            fetchActivities(token);
        } catch (error) {
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchActivities = async (token) => {
        try {
            const response = await axios.get(`${activityApiUrl}/activities/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setActivities(response.data);
        } catch (error) {
            setMessage('Failed to fetch activity log.');
        }
    };

    if (isLoading) {
        return <div className={styles.container}><Navbar /><p>Loading Activity Feed...</p></div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>Activity Feed</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card} style={{ width: '100%', maxWidth: '900px' }}>
                    {activities.length > 0 ? (
                        <ul style={{listStyle: 'none', padding: 0}}>
                            {activities.map(log => (
                                <li key={log.id} style={{borderBottom: '1px solid #eee', padding: '0.75rem'}}>
                                    <strong>User ID {log.user_id}</strong> performed action <strong>{log.action}</strong>
                                    <p style={{margin: '0.25rem 0', color: '#555'}}>{log.details}</p>
                                    <small style={{color: '#999'}}>{new Date(log.timestamp).toLocaleString()}</small>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No recent activity.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
