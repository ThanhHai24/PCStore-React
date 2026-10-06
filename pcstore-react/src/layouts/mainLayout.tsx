import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/storePage/header/header';
import Footer from '../components/storePage/footer/footer';

interface MainLayoutProps {
    children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-gray-50 text-gray-800 font-sans selection:bg-blue-500 selection:text-white">
            {/* Header */}
            <Header />

            {/* Main Content Area */}
            <main className="flex-grow w-full">
                {children ?? <Outlet />}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default MainLayout;
