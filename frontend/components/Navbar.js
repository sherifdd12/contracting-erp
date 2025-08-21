import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';

const Navbar = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState(null);

    // This effect will run on the client side after the component mounts
    // and whenever the route changes.
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
            try {
                const decodedToken = jwtDecode(token);
                setUserRole(decodedToken.role);
            } catch (error) {
                // Handle invalid token
                setUserRole(null);
                setIsLoggedIn(false);
            }
        } else {
            setIsLoggedIn(false);
            setUserRole(null);
        }
    }, [router.asPath]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUserRole(null);
        router.push('/login');
    };

    const { i18n } = useTranslation();
    const handleLanguageSwitch = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const navStyle = {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '1rem',
        background: '#333',
        color: 'white',
        position: 'absolute',
        top: 0,
    };

    const linkStyle = {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1.2rem',
    };

    const buttonStyle = {
        background: 'none',
        border: 'none',
        color: '#ff4d4d',
        cursor: 'pointer',
        fontSize: '1.2rem',
        fontWeight: 'bold',
    };

    return (
        <nav style={navStyle}>
            <Link href={isLoggedIn ? "/dashboard" : "/login"} style={linkStyle}>{t('Home')}</Link>
            {isLoggedIn && (
                <Link href="/projects" style={linkStyle}>{t('Projects')}</Link>
            )}
            {isLoggedIn && (userRole === 'sales' || userRole === 'admin') && (
                <Link href="/quotes" style={linkStyle}>{t('Quotes')}</Link>
            )}
            {isLoggedIn && (userRole === 'accountant' || userRole === 'admin') && (
                <Link href="/accounting" style={linkStyle}>{t('Accounting')}</Link>
            )}
            {isLoggedIn && userRole === 'admin' && (
                <Link href="/hr" style={linkStyle}>{t('HR')}</Link>
            )}
            {isLoggedIn && userRole === 'admin' && (
                <Link href="/activity" style={linkStyle}>Activity</Link>
            )}
            {isLoggedIn && (
                <button onClick={handleLogout} style={buttonStyle}>{t('Logout')}</button>
            )}
            <button onClick={handleLanguageSwitch} style={buttonStyle}>
                {i18n.language === 'en' ? 'عربي' : 'English'}
            </button>
        </nav>
    );
};

export default Navbar;
