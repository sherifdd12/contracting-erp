import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function Dashboard() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h1 className={styles.title}>Welcome to the ERP Dashboard</h1>
                <p>Select an option from the navigation bar to get started.</p>
            </main>
        </div>
    );
}
