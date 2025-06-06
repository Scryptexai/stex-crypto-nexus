
import React from 'react';
import { useLocation } from 'react-router-dom';
import TopNavigation from '../navigation/TopNavigation';
import BottomNavigation from '../navigation/BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      {/* Top Navigation - Desktop */}
      <div className="desktop-only">
        <TopNavigation />
      </div>
      
      {/* Main Content */}
      <main className="pb-20 md:pb-0 md:pt-16">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation - Mobile */}
      <div className="mobile-only">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default Layout;
