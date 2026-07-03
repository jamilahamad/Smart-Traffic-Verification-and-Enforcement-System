import { useCallback, useEffect, useMemo, useState } from 'react';

import useStore from './store/useStore';
import { canAccessPage } from './constants/pages';

import DashboardLayout from './components/layout/DashboardLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PublicVerifyPage from './pages/PublicVerifyPage';
import ProfilePage from './pages/ProfilePage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AllCasesPage from './pages/admin/AllCasesPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManageVehiclesPage from './pages/admin/ManageVehiclesPage';
import BlacklistPage from './pages/admin/BlacklistPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import LicenseRenewalsPage from './pages/admin/LicenseRenewalsPage';
import BrtaPhotoUploadPage from './pages/admin/BrtaPhotoUploadPage';
import ViolationManagementPage from './pages/admin/ViolationManagementPage';

import PoliceDashboard from './pages/police/PoliceDashboard';
import VerifyPage from './pages/police/VerifyPage';
import QRScanPage from './pages/police/QRScanPage';
import CreateCasePage from './pages/police/CreateCasePage';
import MyCasesPage from './pages/police/MyCasesPage';

import DriverDashboard from './pages/driver/DriverDashboard';
import MyLicensePage from './pages/driver/MyLicensePage';
import MyViolationsPage from './pages/driver/MyViolationsPage';

import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyVehiclesPage from './pages/owner/MyVehiclesPage';
import AssignDriversPage from './pages/owner/AssignDriversPage';
import OwnerViolationsPage from './pages/owner/OwnerViolationsPage';

import './styles/AppLayout.css';

const publicPages = ['landing', 'login', 'public-verify'];

const normalizePage = (page) => {
  const aliases = {
    cases: 'my-cases',
    'owner-profile': 'profile',
    'vehicle-violations': 'owner-violations',
    home: 'dashboard',
  };

  return aliases[page] || page || 'dashboard';
};

const buildPageUrl = (page) => {
  const nextPage = normalizePage(page);
  const url = new URL(window.location.href);

  url.pathname = '/';
  url.hash = '';
  url.searchParams.delete('qr');
  url.searchParams.delete('code');

  if (nextPage === 'landing') {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', nextPage);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

const getInitialPage = () => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.toLowerCase();

  const pageFromUrl = params.get('page');
  const hasQR = params.get('qr') || params.get('code');

  if (hasQR || path.includes('verify')) {
    return 'public-verify';
  }

  if (pageFromUrl) {
    return normalizePage(pageFromUrl);
  }

  return 'landing';
};

export default function App() {
  const currentUser = useStore((state) => state.currentUser);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authLoading = useStore((state) => state.authLoading);
  const initAuth = useStore((state) => state.initAuth);

  const [currentPage, setCurrentPage] = useState(getInitialPage);

  const role = currentUser?.role || 'driver';

  const setPageWithBrowserHistory = useCallback((page, mode = 'push') => {
    const nextPage = normalizePage(page);
    const nextUrl = buildPageUrl(nextPage);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      if (mode === 'replace') {
        window.history.replaceState({ page: nextPage }, '', nextUrl);
      } else {
        window.history.pushState({ page: nextPage }, '', nextUrl);
      }
    }

    setCurrentPage(nextPage);
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const handleBrowserBackForward = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener('popstate', handleBrowserBackForward);

    return () => {
      window.removeEventListener('popstate', handleBrowserBackForward);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && publicPages.includes(currentPage)) {
      setPageWithBrowserHistory('dashboard', 'replace');
      return;
    }

    if (!isAuthenticated && !publicPages.includes(currentPage)) {
      setPageWithBrowserHistory('landing', 'replace');
      return;
    }

    if (
      isAuthenticated &&
      !publicPages.includes(currentPage) &&
      !canAccessPage(role, currentPage)
    ) {
      setPageWithBrowserHistory('dashboard', 'replace');
    }
  }, [isAuthenticated, currentPage, role, setPageWithBrowserHistory]);

  const handleNavigate = useCallback(
    (page) => {
      const nextPage = normalizePage(page);

      if (isAuthenticated && !publicPages.includes(nextPage) && !canAccessPage(role, nextPage)) {
        setPageWithBrowserHistory('dashboard');
        return;
      }

      setPageWithBrowserHistory(nextPage);
    },
    [isAuthenticated, role, setPageWithBrowserHistory]
  );

  const commonPageProps = useMemo(
    () => ({
      onNavigate: handleNavigate,
      currentPage,
    }),
    [handleNavigate, currentPage]
  );

  const renderDashboardByRole = () => {
    if (role === 'admin') {
      return <AdminDashboard {...commonPageProps} />;
    }

    if (role === 'police') {
      return <PoliceDashboard {...commonPageProps} />;
    }

    if (role === 'owner') {
      return <OwnerDashboard {...commonPageProps} />;
    }

    return <DriverDashboard {...commonPageProps} />;
  };

  const renderProtectedPage = () => {
    if (!canAccessPage(role, currentPage)) {
      return renderDashboardByRole();
    }

    switch (currentPage) {
      case 'dashboard':
        return renderDashboardByRole();

      case 'profile':
        return <ProfilePage {...commonPageProps} />;

      case 'verify':
        return <VerifyPage {...commonPageProps} />;

      case 'qr-scan':
        return <QRScanPage {...commonPageProps} />;

      case 'create-case':
        return <CreateCasePage {...commonPageProps} />;

      case 'my-cases':
        return <MyCasesPage {...commonPageProps} />;

      case 'all-cases':
        return <AllCasesPage {...commonPageProps} />;

      case 'manage-users':
        return <ManageUsersPage {...commonPageProps} />;

      case 'manage-vehicles':
        return <ManageVehiclesPage {...commonPageProps} />;

      case 'blacklist':
        return <BlacklistPage {...commonPageProps} />;

      case 'analytics':
        return <AnalyticsPage {...commonPageProps} />;

      case 'activity-logs':
        return <ActivityLogsPage {...commonPageProps} />;

      case 'license-renewals':
        return <LicenseRenewalsPage {...commonPageProps} />;

      case 'brta-photos':
        return <BrtaPhotoUploadPage {...commonPageProps} />;

      case 'violation-management':
        return <ViolationManagementPage {...commonPageProps} />;

      case 'my-license':
        return <MyLicensePage {...commonPageProps} />;

      case 'my-violations':
        return <MyViolationsPage {...commonPageProps} />;

      case 'my-vehicles':
        return <MyVehiclesPage {...commonPageProps} />;

      case 'assign-drivers':
        return <AssignDriversPage {...commonPageProps} />;

      case 'owner-violations':
        return <OwnerViolationsPage {...commonPageProps} />;

      default:
        return renderDashboardByRole();
    }
  };

  const renderPublicPage = () => {
    if (currentPage === 'public-verify') {
      return (
        <PublicVerifyPage
          onBack={() => handleNavigate('landing')}
          onLogin={() => handleNavigate('login')}
        />
      );
    }

    if (currentPage === 'login') {
      return (
        <LoginPage
          onBack={() => handleNavigate('landing')}
          onLoginSuccess={() => handleNavigate('dashboard')}
        />
      );
    }

    return (
      <LandingPage
        onLogin={() => handleNavigate('login')}
        onVerify={() => handleNavigate('public-verify')}
      />
    );
  };

  if (authLoading) {
    return (
      <LoadingSpinner
        fullPage
        size="lg"
        text="Preparing STVES secure dashboard..."
      />
    );
  }

  if (!isAuthenticated) {
    return renderPublicPage();
  }

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderProtectedPage()}
    </DashboardLayout>
  );
}