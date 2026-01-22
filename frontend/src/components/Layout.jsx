import React, { useState } from 'react';
import { Home, MessageCircle, BookOpen, Menu, X, Users, School, Baby, DollarSign, MapPin, Briefcase, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const Layout = ({ children, userProfile }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Define all possible navigation items
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', alwaysShow: true },
    { id: 'housing', label: 'Housing', icon: MapPin, path: '/housing', condition: 'needsHousing' },
    { id: 'schools', label: 'Schools', icon: School, path: '/schools', condition: 'hasChildren' },
    { id: 'childcare', label: 'Childcare', icon: Baby, path: '/childcare', condition: 'hasChildren' },
    { id: 'employment', label: 'Employment', icon: Briefcase, path: '/employment', condition: 'needsEmployment' },
    { id: 'insurance', label: 'Insurance', icon: DollarSign, path: '/insurance', alwaysShow: true },
    { id: 'community', label: 'Community', icon: Users, path: '/community', alwaysShow: true },
    { id: 'resources', label: 'Resources', icon: BookOpen, path: '/resources', alwaysShow: true }
  ];

  // Filter navigation items based on user profile
  const getVisibleNavItems = () => {
    if (!userProfile) return allNavItems.filter(item => item.alwaysShow);
    
    return allNavItems.filter(item => {
      if (item.alwaysShow) return true;
      if (!item.condition) return false;
      return userProfile[item.condition] === true;
    });
  };

  const navItems = getVisibleNavItems();
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('userProfile');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Home className="w-6 h-6 text-green-600" />
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Recovery Hub</h1>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {userProfile && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ml-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {userProfile && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};