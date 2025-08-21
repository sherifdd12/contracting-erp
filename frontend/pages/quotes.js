import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import jsPDF from 'jspdf';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function QuotesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [quotes, setQuotes] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [clientName, setClientName] = useState('');
    const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);

    const quotesApiUrl = process.env.NEXT_PUBLIC_QUOTES_API_URL || 'http://localhost:8006';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            if (decodedToken.role !== 'sales' && decodedToken.role !== 'admin') {
                setMessage('Access Denied: Sales or Admins only.');
                setTimeout(() => router.push('/dashboard'), 3000);
                return;
            }
            fetchQuotes(token);
        } catch (error) {
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const fetchQuotes = async (token) => {
        try {
            const response = await axios.get(`${quotesApiUrl}/quotes/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setQuotes(response.data);
        } catch (error) {
            setMessage('Failed to fetch quotes.');
        }
    };

    const handleItemChange = (index, event) => {
        const values = [...lineItems];
        values[index][event.target.name] = event.target.value;
        setLineItems(values);
    };

    const handleAddItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const values = [...lineItems];
        values.splice(index, 1);
        setLineItems(values);
    };

    const handleCreateQuote = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `${quotesApiUrl}/quotes/`,
                { client_name: clientName, items: lineItems.map(item => ({...item, quantity: parseFloat(item.quantity), unit_price: parseFloat(item.unit_price)})) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Quote created successfully!');
            setClientName('');
            setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
            fetchQuotes(token);
        } catch (error) {
            setMessage(`Failed to create quote: ${error.response?.data?.detail || error.message}`);
        }
    };

    const generatePdf = (quote) => {
        const doc = new jsPDF();
        doc.text(`Quotation #${quote.id}`, 20, 20);
        doc.text(`Client: ${quote.client_name}`, 20, 30);
        doc.text(`Date: ${new Date(quote.created_date).toLocaleDateString()}`, 20, 40);
        doc.text(`Status: ${quote.status}`, 20, 50);

        let y = 70;
        doc.text("Line Items:", 20, y);
        y += 10;
        quote.items.forEach(item => {
            doc.text(`${item.description} (Qty: ${item.quantity}, Price: $${item.unit_price.toFixed(2)})`, 30, y);
            y += 10;
        });

        doc.text(`Total Amount: $${quote.total_amount.toFixed(2)}`, 20, y + 10);
        doc.save(`Quotation-${quote.id}.pdf`);
    };

    if (isLoading) return <div className={styles.container}><p>Loading...</p></div>;

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>{t('Quotes')}</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    <div className={styles.card} style={{ width: '100%', maxWidth: '600px' }}>
                        <h3>{t('Create_New_Quotation')}</h3>
                        <form onSubmit={handleCreateQuote}>
                            <input type="text" placeholder={t('Client_Name')} value={clientName} onChange={e => setClientName(e.target.value)} required />
                            <h4>{t('Line_Items')}</h4>
                            {lineItems.map((item, index) => (
                                <div key={index} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                    <input type="text" name="description" placeholder={t('Description')} value={item.description} onChange={e => handleItemChange(index, e)} required />
                                    <input type="number" name="quantity" placeholder={t('Quantity')} value={item.quantity} onChange={e => handleItemChange(index, e)} required style={{width: '80px'}}/>
                                    <input type="number" name="unit_price" placeholder={t('Unit_Price')} value={item.unit_price} onChange={e => handleItemChange(index, e)} required style={{width: '100px'}}/>
                                    <button type="button" onClick={() => handleRemoveItem(index)}>X</button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddItem}>{t('Add_Item')}</button>
                            <button type="submit" style={{marginTop: '1rem'}}>{t('Save_Quotation')}</button>
                        </form>
                    </div>

                    <div className={styles.card} style={{ width: '100%', maxWidth: '800px' }}>
                        <h3>{t('Existing_Quotations')}</h3>
                        {quotes.map(quote => (
                            <div key={quote.id} style={{borderBottom: '1px solid #eee', padding: '1rem'}}>
                                <strong>{t('Quotes')} #{quote.id}</strong> for {quote.client_name} - {t('Total')}: ${quote.total_amount.toFixed(2)}
                                <button onClick={() => generatePdf(quote)} style={{marginLeft: '1rem'}}>{t('Generate_PDF')}</button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
