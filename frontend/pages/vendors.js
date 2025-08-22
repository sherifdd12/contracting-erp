import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function VendorsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [vendors, setVendors] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [bills, setBills] = useState([]); // For now, we'll just list them.
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [vendorName, setVendorName] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billVendorId, setBillVendorId] = useState('');
    const [billExpenseAccountId, setBillExpenseAccountId] = useState('');


    const accountingApiUrl = process.env.NEXT_PUBLIC_ACCOUNTING_API_URL || 'http://localhost:8003';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            const decodedToken = jwtDecode(token);
            if (decodedToken.role !== 'accountant' && decodedToken.role !== 'admin') {
                router.push('/dashboard'); // Or show access denied
                return;
            }
            fetchVendors(token);
            fetchAccounts(token);
        } catch (error) {
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchVendors = async (token) => {
        try {
            const res = await axios.get(`${accountingApiUrl}/vendors/`, { headers: { Authorization: `Bearer ${token}` } });
            setVendors(res.data);
        } catch (error) { setMessage('Failed to fetch vendors.'); }
    };

    const fetchAccounts = async (token) => {
        try {
            const res = await axios.get(`${accountingApiUrl}/accounts/`, { headers: { Authorization: `Bearer ${token}` } });
            setAccounts(res.data.filter(acc => acc.type === 'Expense')); // Only show expense accounts
        } catch (error) { setMessage('Failed to fetch accounts.'); }
    };

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${accountingApiUrl}/vendors/`, { name: vendorName }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage('Vendor created!');
            setVendorName('');
            fetchVendors(token);
        } catch (error) { setMessage('Failed to create vendor.'); }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${accountingApiUrl}/bills/`, {
                vendor_id: parseInt(billVendorId),
                amount: parseFloat(billAmount),
                expense_account_id: parseInt(billExpenseAccountId)
            }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage('Bill created and journal entry posted!');
            setBillAmount('');
            // In a real app, you'd fetch and display bills here.
        } catch (error) { setMessage(`Failed to create bill: ${error.response?.data?.detail}`); }
    };

    if (isLoading) return <div className={styles.container}><Navbar /><p>Loading...</p></div>;

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>Vendors & Bills (A/P)</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>Vendors</h3>
                        <ul>{vendors.map(v => <li key={v.id}>{v.name}</li>)}</ul>
                        <hr />
                        <h4>Add New Vendor</h4>
                        <form onSubmit={handleCreateVendor}>
                            <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor Name" required />
                            <button type="submit">Add Vendor</button>
                        </form>
                    </div>

                    <div className={styles.card}>
                        <h3>Enter a New Bill</h3>
                        <form onSubmit={handleCreateBill}>
                            <select value={billVendorId} onChange={e => setBillVendorId(e.target.value)} required>
                                <option value="">-- Select Vendor --</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <select value={billExpenseAccountId} onChange={e => setBillExpenseAccountId(e.target.value)} required>
                                <option value="">-- Select Expense Account --</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                            <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="Bill Amount" required />
                            <button type="submit">Enter Bill</button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
