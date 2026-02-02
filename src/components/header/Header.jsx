'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bars3Icon, UserCircleIcon, Cog6ToothIcon, PowerIcon } from '@heroicons/react/24/outline';
import { logoutViaApi, getCurrentUser, getUserRole } from '@/utils/auth';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [userRole, setUserRole] = useState('User');
  const [hydrated, setHydrated] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const name = getCurrentUser() || 'User';
    const role = getUserRole() || 'User';
    setUserIdentifier(name);
    setUserRole(role);
    setHydrated(true);
  }, []);

  const userInitials = (userIdentifier?.trim?.()[0] || 'U').toUpperCase();

  useEffect(() => {
    const handlePageChange = (e) => {
      setPageTitle(e.detail.title || 'Dashboard');
    };

    window.addEventListener('pageChange', handlePageChange);
    return () => window.removeEventListener('pageChange', handlePageChange);    
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showProfile) return;
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowProfile(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfile]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logoutViaApi();
    router.push('/login');
  };

  return (
    <header className="pc-header">
      <div className="header-wrapper">

        {/* Mobile Menu Block */}
        <div className="me-auto pc-mob-drp">
          <ul className="list-unstyled">
            <li className="pc-h-item pc-sidebar-collapse">
              <a
                href="#"
                className="pc-head-link ms-0"
                id="sidebar-hide"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleSidebar?.();
                }}
              >      
                <Bars3Icon style={{width: '20px', height: '20px'}} />
              </a>
            </li>
          </ul>
        </div>

        <div className="ms-auto">
            <ul className="list-unstyled">
              {/* Register Button (hidden for now) */}
              {false && (
                <li className="pc-h-item">
                  <Link href="/register" className="pc-head-link header-register-btn">
                    Register
                  </Link>
                </li>
              )}

              {/* User Profile */}
              <li className="dropdown pc-h-item header-user-profile" ref={profileRef}>
                <a 
                  className="pc-head-link dropdown-toggle arrow-none me-0" 
                  href="#" 
                  role="button"
                  onClick={(e) => { e.preventDefault(); setShowProfile(!showProfile); }}
                >
                  <div className="user-avtar">
                    {hydrated ? userInitials : ''}
                  </div>
                  <span className="ms-2">
                    <span className="user-name">{hydrated ? userIdentifier : ''}</span>
                    <span className="user-desc">{hydrated ? userRole : ''}</span>
                  </span>
                </a>
                {showProfile && (
                  <div className="dropdown-menu dropdown-user-profile dropdown-menu-end pc-h-dropdown show">
                    <div className="dropdown-body-profile">
                      <div className="profile-user-info">
                        <div className="profile-avatar-container">
                          <div className="profile-avatar">
                            <UserCircleIcon style={{width: '20px', height: '20px'}} />
                          </div>
                        </div>
                        <div className="profile-user-details">
                          <h5 className="profile-user-name">{userIdentifier}</h5>
                          <span className="profile-user-email">{userRole}</span>
                        </div>
                      </div>
                       
                         
                        <a href="#" className="profile-action-item" onClick={handleLogout}>
                          <PowerIcon className="profile-action-icon" style={{width: '20px', height: '20px'}} />
                          <span>Logout</span>
                        </a>
                      </div>
                    </div>
                   
                )}
              </li>
            </ul>
          </div>
        </div>
      </header>
  );
}
