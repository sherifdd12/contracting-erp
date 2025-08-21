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
        } catch (error) {
            router.push('/'); // Invalid token
        } finally {
            setIsLoading(false);
        }
    }, [router]);

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
                    <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                        <h3>{t('Select_a_Project')}</h3>
                        <select onChange={handleProjectChange} value={selectedProjectId} style={{width: '100%', padding: '0.5rem', marginBottom: '1rem'}}>
                            <option value="">{t('Select_a_Project')}</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>

                        {selectedProjectId && (
                            <>
                                <h4>{t('Create_New_Invoice')}</h4>
                                <form onSubmit={handleCreateInvoice}>
                                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('Amount')} required />
                                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder={t('Due_Date')} />
                                    <button type="submit">{t('Create_New_Invoice')}</button>
                                </form>
                            </>
                        )}
                    </div>

                    <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                        <h3>{t('Invoices_for_Selected_Project')}</h3>
                        {invoices.length > 0 ? (
                            <table style={{width: '100%', textAlign: 'left'}}>
                                <thead><tr><th>{t('ID')}</th><th>{t('Amount')}</th><th>{t('Status')}</th><th>{t('Due_Date')}</th></tr></thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td>{invoice.id}</td>
                                            <td>${invoice.amount.toFixed(2)}</td>
                                            <td>{invoice.status}</td>
                                            <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>{t('No_invoices_found')}</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
