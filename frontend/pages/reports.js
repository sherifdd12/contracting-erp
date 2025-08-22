import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function ReportsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [pnl, setPnl] = useState(null);
    const [balanceSheet, setBalanceSheet] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const analyticsApiUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:8007';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            const decodedToken = jwtDecode(token);
            if (decodedToken.role !== 'accountant' && decodedToken.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
        } catch (error) {
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchPnl = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${analyticsApiUrl}/reports/profit-and-loss`, { headers: { Authorization: `Bearer ${token}` } });
            setPnl(res.data);
            setBalanceSheet(null); // Clear other report
        } catch (error) { setMessage('Failed to fetch P&L report.'); }
    };

    const fetchBalanceSheet = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${analyticsApiUrl}/reports/balance-sheet`, { headers: { Authorization: `Bearer ${token}` } });
            setBalanceSheet(res.data);
            setPnl(null); // Clear other report
        } catch (error) { setMessage('Failed to fetch Balance Sheet.'); }
    };

    const ReportTable = ({ title, lines }) => (
        <table style={{width: '100%', marginTop: '0.5rem'}}>
            <tbody>
                {lines.map(line => (
                    <tr key={line.account_name}><td>{line.account_name}</td><td style={{textAlign: 'right'}}>${line.balance.toFixed(2)}</td></tr>
                ))}
            </tbody>
        </table>
    );

    if (isLoading) return <div className={styles.container}><Navbar /><p>Loading...</p></div>;

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>Financial Reports</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card} style={{width: '100%', maxWidth: '800px'}}>
                    <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                        <button onClick={fetchPnl}>Profit & Loss</button>
                        <button onClick={fetchBalanceSheet}>Balance Sheet</button>
                    </div>

                    {pnl && (
                        <div style={{marginTop: '2rem'}}>
                            <h3>Profit & Loss Statement</h3>
                            <h4>Revenues</h4>
                            <ReportTable lines={pnl.revenue_lines} />
                            <p><strong>Total Revenue: ${pnl.total_revenue.toFixed(2)}</strong></p>
                            <hr/>
                            <h4>Expenses</h4>
                            <ReportTable lines={pnl.expense_lines} />
                            <p><strong>Total Expenses: ${pnl.total_expense.toFixed(2)}</strong></p>
                            <hr/>
                            <p><strong>Net Income: ${pnl.net_income.toFixed(2)}</strong></p>
                        </div>
                    )}

                    {balanceSheet && (
                        <div style={{marginTop: '2rem'}}>
                            <h3>Balance Sheet</h3>
                            <h4>Assets</h4>
                            <ReportTable lines={balanceSheet.asset_lines} />
                            <p><strong>Total Assets: ${balanceSheet.total_assets.toFixed(2)}</strong></p>
                            <hr/>
                            <h4>Liabilities</h4>
                            <ReportTable lines={balanceSheet.liability_lines} />
                            <p><strong>Total Liabilities: ${balanceSheet.total_liabilities.toFixed(2)}</strong></p>
                            <hr/>
                             <h4>Equity</h4>
                            <ReportTable lines={balanceSheet.equity_lines} />
                            <p><strong>Total Equity: ${balanceSheet.total_equity.toFixed(2)}</strong></p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
