
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ArrowUpDown, Plus, Sun, ArrowRight } from 'lucide-react';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/swap', icon: ArrowUpDown, label: 'Swap' },
    { path: '/create', icon: Plus, label: 'Create' },
    { path: '/gm', icon: Sun, label: 'GM' },
    { path: '/bridge', icon: ArrowRight, label: 'Bridge' }
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
