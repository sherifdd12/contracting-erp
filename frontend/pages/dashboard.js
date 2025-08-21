import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const router = useRouter();
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    const analyticsApiUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:8007';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            fetchSummary(token);
        }
    }, [router]);

    const fetchSummary = async (token) => {
        try {
            const response = await axios.get(`${analyticsApiUrl}/analytics/summary`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSummary(response.data);
        } catch (error) {
            setMessage('Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = summary ? [
        { name: 'Financials', Budget: summary.total_project_budget, Paid: summary.total_invoice_paid, Accepted_Quotes: summary.total_quotes_accepted },
    ] : [];

    if (isLoading) {
        return <div className={styles.container}><Navbar /><p>Loading Dashboard...</p></div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h1 className={styles.title} style={{marginTop: '5rem'}}>Dashboard</h1>
                {message && <p className={styles.message}>{message}</p>}

                {summary && (
                    <>
                        {/* Stat Cards */}
                        <div className={styles.grid}>
                            <div className={styles.card}><h3>Total Projects</h3><p style={{fontSize: '2rem'}}>{summary.total_projects}</p></div>
                            <div className={styles.card}><h3>Total Budget</h3><p style={{fontSize: '2rem'}}>${summary.total_project_budget.toFixed(2)}</p></div>
                            <div className={styles.card}><h3>Invoices Paid</h3><p style={{fontSize: '2rem'}}>${summary.total_invoice_paid.toFixed(2)}</p></div>
                            <div className={styles.card}><h3>Accepted Quotes</h3><p style={{fontSize: '2rem'}}>${summary.total_quotes_accepted.toFixed(2)}</p></div>
                        </div>

                        {/* Chart */}
                        <div className={styles.card} style={{width: '100%', maxWidth: '1000px', marginTop: '2rem'}}>
                            <h3>Financial Overview</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="Budget" fill="#8884d8" />
                                    <Bar dataKey="Paid" fill="#82ca9d" />
                                    <Bar dataKey="Accepted_Quotes" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
