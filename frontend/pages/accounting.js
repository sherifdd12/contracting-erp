import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function AccountingPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [invoices, setInvoices] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    const projectsApiUrl = process.env.NEXT_PUBLIC_PROJECTS_API_URL || 'http://localhost:8002';
    const accountingApiUrl = process.env.NEXT_PUBLIC_ACCOUNTING_API_URL || 'http://localhost:8003';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            if (decodedToken.role !== 'accountant' && decodedToken.role !== 'admin') {
                setMessage('Access Denied: You do not have permission to view this page.');
                setTimeout(() => router.push('/projects'), 3000);
                return;
            }
            fetchProjects(token);
            fetchAccounts(token);
        } catch (error) {
            router.push('/'); // Invalid token
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchAccounts = async (token) => {
        try {
            const response = await axios.get(`${accountingApiUrl}/accounts/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAccounts(response.data);
        } catch (error) {
            setMessage('Failed to fetch chart of accounts.');
        }
    };

    const fetchProjects = async (token) => {
        try {
            const response = await axios.get(`${projectsApiUrl}/projects/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjects(response.data);
        } catch (error) {
            setMessage('Failed to fetch projects.');
        }
    };

    const fetchInvoicesForProject = async (projectId, token) => {
        if (!projectId) {
            setInvoices([]);
            return;
        }
        try {
            const response = await axios.get(`${accountingApiUrl}/invoices/project/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setInvoices(response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setInvoices([]); // No invoices found
            } else {
                setMessage('Failed to fetch invoices.');
            }
        }
    };

    const handleProjectChange = (e) => {
        const projectId = e.target.value;
        setSelectedProjectId(projectId);
        const token = localStorage.getItem('token');
        fetchInvoicesForProject(projectId, token);
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token || !selectedProjectId) {
            setMessage('Please select a project first.');
            return;
        }
        try {
            await axios.post(
                `${accountingApiUrl}/invoices/`,
                { project_id: parseInt(selectedProjectId), amount: parseFloat(amount), due_date: dueDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Invoice created successfully!');
            setAmount('');
            setDueDate('');
            fetchInvoicesForProject(selectedProjectId, token);
        } catch (error) {
            setMessage(`Failed to create invoice: ${error.response?.data?.detail || error.message}`);
        }
    };

    // --- Chart of Accounts State & Handler ---
    const [accName, setAccName] = useState('');
    const [accType, setAccType] = useState('Asset');
    const [accNormalBalance, setAccNormalBalance] = useState('debit');

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `${accountingApiUrl}/accounts/`,
                { name: accName, type: accType, normal_balance: accNormalBalance },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Account created successfully!');
            setAccName('');
            fetchAccounts(token);
        } catch (error) {
            setMessage(`Failed to create account: ${error.response?.data?.detail || error.message}`);
        }
    };

    // --- Journal Entry State & Handler ---
    const [journalDesc, setJournalDesc] = useState('');
    const [journalLines, setJournalLines] = useState([{ account_id: '', type: 'debit', amount: 0 }]);

    const handleJournalLineChange = (index, event) => {
        const values = [...journalLines];
        values[index][event.target.name] = event.target.value;
        setJournalLines(values);
    };
    const addJournalLine = () => setJournalLines([...journalLines, { account_id: '', type: 'debit', amount: 0 }]);
    const removeJournalLine = (index) => {
        const values = [...journalLines];
        values.splice(index, 1);
        setJournalLines(values);
    };
    const totalDebits = journalLines.reduce((sum, line) => line.type === 'debit' ? sum + parseFloat(line.amount || 0) : sum, 0);
    const totalCredits = journalLines.reduce((sum, line) => line.type === 'credit' ? sum + parseFloat(line.amount || 0) : sum, 0);

    const handleCreateJournalEntry = async (e) => {
        e.preventDefault();
        if (totalDebits !== totalCredits || totalDebits === 0) {
            setMessage('Entry is not balanced or is empty.');
            return;
        }
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `${accountingApiUrl}/journal-entries/`,
                { description: journalDesc, lines: journalLines.map(l => ({...l, account_id: parseInt(l.account_id), amount: parseFloat(l.amount)})) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Journal entry created successfully!');
            setJournalDesc('');
            setJournalLines([{ account_id: '', type: 'debit', amount: 0 }]);
            fetchAccounts(token); // Refresh account balances
        } catch (error) {
            setMessage(`Failed to create journal entry: ${error.response?.data?.detail || error.message}`);
        }
    };


    if (isLoading) {
        return <div className={styles.container}><p>Loading...</p></div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>{t('Accounting')}</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    {/* Left Column: Chart of Accounts Management */}
                    <div className={styles.card} style={{width: '100%', maxWidth: '600px'}}>
                        <h3>{t('Chart_of_Accounts')}</h3>
                        <table style={{width: '100%', textAlign: 'left'}}>
                            <thead><tr><th>{t('Account_Name')}</th><th>{t('Type')}</th><th>{t('Balance')}</th></tr></thead>
                            <tbody>
                                {accounts.map((acc) => (
                                    <tr key={acc.id}><td>{acc.name}</td><td>{acc.type}</td><td>${acc.balance.toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <hr style={{margin: '2rem 0'}} />
                        <h4>{t('Create_New_Account')}</h4>
                        <form onSubmit={handleCreateAccount}>
                            <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder={t('Account_Name')} required/>
                            <select value={accType} onChange={e => setAccType(e.target.value)}>
                                <option>Asset</option><option>Liability</option><option>Equity</option><option>Revenue</option><option>Expense</option>
                            </select>
                            <select value={accNormalBalance} onChange={e => setAccNormalBalance(e.target.value)}>
                                <option value="debit">{t('Debit')}</option><option value="credit">{t('Credit')}</option>
                            </select>
                            <button type="submit">{t('Create_Account')}</button>
                        </form>
                    </div>

                    {/* Right Column: Manual Journal Entry */}
                    <div className={styles.card} style={{width: '100%', maxWidth: '600px'}}>
                        <h3>{t('Manual_Journal_Entry')}</h3>
                        <form onSubmit={handleCreateJournalEntry}>
                            <input type="text" value={journalDesc} onChange={e => setJournalDesc(e.target.value)} placeholder={t('Entry_Description')} required/>
                            {journalLines.map((line, index) => (
                                <div key={index} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                    <select name="account_id" value={line.account_id} onChange={e => handleJournalLineChange(index, e)} required>
                                        <option value="">{t('Select_Account')}</option>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                    </select>
                                    <select name="type" value={line.type} onChange={e => handleJournalLineChange(index, e)}>
                                        <option value="debit">{t('Debit')}</option><option value="credit">{t('Credit')}</option>
                                    </select>
                                    <input type="number" name="amount" step="0.01" value={line.amount} onChange={e => handleJournalLineChange(index, e)} placeholder={t('Amount')} required />
                                    <button type="button" onClick={() => removeJournalLine(index)}>X</button>
                                </div>
                            ))}
                            <button type="button" onClick={addJournalLine}>{t('Add_Line')}</button>
                            <div style={{marginTop: '1rem', fontWeight: 'bold'}}>
                                {t('Debits')}: ${totalDebits.toFixed(2)} | {t('Credits')}: ${totalCredits.toFixed(2)}
                            </div>
                            <button type="submit" style={{marginTop: '1rem'}} disabled={totalDebits !== totalCredits || totalDebits === 0}>{t('Post_Entry')}</button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
