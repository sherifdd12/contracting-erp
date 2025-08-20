import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            router.replace('/dashboard');
        } else {
            router.replace('/login');
        }
    }, [router]);

    return (
        <div className={styles.container}>
            <p>Loading...</p>
        </div>
    );
}
