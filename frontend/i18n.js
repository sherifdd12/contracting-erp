import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    debug: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // Not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: {
          Home: "Home",
          Projects: "Projects",
          Quotes: "Quotes",
          Accounting: "Accounting",
          HR: "Human Resources",
          Logout: "Logout",
          Login: "Login",
          Register: "Register",
          Welcome_to_Dashboard: "Welcome to the ERP Dashboard",
          Select_option_to_start: "Select an option from the navigation bar to get started."
        }
      },
      ar: {
        translation: {
          Home: "الرئيسية",
          Projects: "المشاريع",
          Quotes: "عروض الأسعار",
          Accounting: "المحاسبة",
          HR: "الموارد البشرية",
          Logout: "تسجيل الخروج",
          Login: "تسجيل الدخول",
          Register: "تسجيل",
          Welcome_to_Dashboard: "أهلاً بك في لوحة تحكم نظام تخطيط الموارد",
          Select_option_to_start: "اختر خيارًا من شريط التنقل للبدء."
        }
      }
    }
  });

export default i18n;
