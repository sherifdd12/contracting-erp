import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const Navbar = () => {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // This effect will run on the client side after the component mounts
    // and whenever the route changes.
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, [router.asPath]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        router.push('/');
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
            <Link href="/" style={linkStyle}>Home</Link>
            {isLoggedIn && (
                <Link href="/projects" style={linkStyle}>Projects</Link>
            )}
            {isLoggedIn && (
                <button onClick={handleLogout} style={buttonStyle}>Logout</button>
            )}
        </nav>
    );
};

export default Navbar;
