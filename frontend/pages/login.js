import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function LoginPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [logUsername, setLogUsername] = useState('');
    const [logPassword, setLogPassword] = useState('');
    const [message, setMessage] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        const formData = new URLSearchParams();
        formData.append('username', logUsername);
        formData.append('password', logPassword);

        try {
            const response = await axios.post(`${apiUrl}/token`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', response.data.access_token);
            }
            setMessage(`${t('Login')} ${t('Redirecting')}`);
            router.push('/dashboard'); // Redirect to dashboard now
        } catch (error) {
            setMessage(`${t('Login_failed')}: ${error.response?.data?.detail || error.message}`);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card}>
                    <h2>{t('Login')}</h2>
                    <form onSubmit={handleLogin}>
                        <input type="text" value={logUsername} onChange={(e) => setLogUsername(e.target.value)} placeholder={t('Username')} required />
                        <input type="password" value={logPassword} onChange={(e) => setLogPassword(e.target.value)} placeholder={t('Password')} required />
                        <button type="submit">{t('Login')}</button>
                    </form>
                    <p style={{textAlign: 'center', marginTop: '1rem'}}>
                        {t('Dont_have_account')} <Link href="/register">{t('Register_here')}</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
