import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';
import styles from '../styles/Home.module.css'; // We need the styles now

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
            try {
                const decodedToken = jwtDecode(token);
                setUserRole(decodedToken.role);
            } catch (error) {
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

    const handleLanguageSwitch = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const navStyle = {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        background: '#333',
        color: 'white',
    };

    const linkStyle = {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1.2rem',
        margin: '0 1rem'
    };

    const mobileLinkStyle = {
        ...linkStyle,
        margin: '0.5rem 0',
    };

    const buttonStyle = {
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1.2rem',
        fontWeight: 'bold',
    };

    const desktopNavLinks = (
        <div className={styles.desktopNav}>
            <Link href={isLoggedIn ? "/dashboard" : "/login"} style={linkStyle}>{t('Home')}</Link>
            {isLoggedIn && <Link href="/projects" style={linkStyle}>{t('Projects')}</Link>}
            {isLoggedIn && (userRole === 'sales' || userRole === 'admin') && <Link href="/quotes" style={linkStyle}>{t('Quotes')}</Link>}
            {isLoggedIn && (userRole === 'accountant' || userRole === 'admin') && <Link href="/accounting" style={linkStyle}>{t('Accounting')}</Link>}
            {isLoggedIn && userRole === 'admin' && <Link href="/hr" style={linkStyle}>{t('HR')}</Link>}
            {isLoggedIn && userRole === 'admin' && <Link href="/activity" style={linkStyle}>Activity</Link>}
            {isLoggedIn && <button onClick={handleLogout} style={buttonStyle}>{t('Logout')}</button>}
            <button onClick={handleLanguageSwitch} style={buttonStyle}>{i18n.language === 'en' ? 'عربي' : 'English'}</button>
        </div>
    );

    const mobileNavLinks = (
        <div className={styles.mobileMenu}>
            <Link href={isLoggedIn ? "/dashboard" : "/login"} style={mobileLinkStyle}>{t('Home')}</Link>
            {isLoggedIn && <Link href="/projects" style={mobileLinkStyle}>{t('Projects')}</Link>}
            {isLoggedIn && (userRole === 'sales' || userRole === 'admin') && <Link href="/quotes" style={mobileLinkStyle}>{t('Quotes')}</Link>}
            {isLoggedIn && (userRole === 'accountant' || userRole === 'admin') && <Link href="/accounting" style={mobileLinkStyle}>{t('Accounting')}</Link>}
            {isLoggedIn && userRole === 'admin' && <Link href="/hr" style={mobileLinkStyle}>{t('HR')}</Link>}
            {isLoggedIn && userRole === 'admin' && <Link href="/activity" style={mobileLinkStyle}>Activity</Link>}
            {isLoggedIn && <button onClick={handleLogout} style={{...buttonStyle, ...mobileLinkStyle}}>{t('Logout')}</button>}
            <button onClick={handleLanguageSwitch} style={{...buttonStyle, ...mobileLinkStyle}}>{i18n.language === 'en' ? 'عربي' : 'English'}</button>
        </div>
    );

    return (
        <nav style={navStyle}>
            <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>ERP System</div>
            {desktopNavLinks}
            <button className={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                &#9776; {/* Hamburger Icon */}
            </button>
            {isMobileMenuOpen && mobileNavLinks}
        </nav>
    );
};

export default Navbar;
