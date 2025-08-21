import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function RegisterPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState('engineer');
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
            setMessage(`${t('User_created_successfully')} ${t('Redirecting')}`);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (error) {
            setMessage(`${t('Registration_failed')}: ${error.response?.data?.detail || error.message}`);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card}>
                    <h2>{t('Register')}</h2>
                    <form onSubmit={handleRegister}>
                        <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder={t('Username')} required />
                        <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={t('Email')} required />
                        <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={t('Password')} required />
                        <select value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                            <option value="engineer">{t('Engineer')}</option>
                            <option value="sales">{t('Sales')}</option>
                            <option value="accountant">{t('Accountant')}</option>
                            <option value="admin">{t('Admin')}</option>
                        </select>
                        <button type="submit">{t('Register')}</button>
                    </form>
                    <p style={{textAlign: 'center', marginTop: '1rem'}}>
                        {t('Already_have_account')} <Link href="/login">{t('Login_here')}</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
