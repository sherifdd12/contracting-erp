import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from '../Navbar';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: '/',
      push: jest.fn(),
    };
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str) => str,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'en',
      },
    };
  },
}));

describe('Navbar', () => {
  it('renders the brand name and home link', () => {
    render(<Navbar />);

    // Check for the brand name
    const brandElement = screen.getByText(/ERP System/i);
    expect(brandElement).toBeInTheDocument();

    // Check for the "Home" link, which is always visible
    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).toBeInTheDocument();
  });
});
