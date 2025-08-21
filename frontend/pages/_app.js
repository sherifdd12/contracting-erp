import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n'; // Initialize i18next
import '../styles/Home.module.css'; // Using module CSS as global is not standard, but follows project setup

function MyApp({ Component, pageProps }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set document direction and language based on i18next state
    // i18next-languagedetector will handle setting the initial language
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  return <Component {...pageProps} />;
}

export default MyApp;
