import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  Clock,
  Info,
  LogOut,
  Menu,
  RefreshCw,
  Shield,
  User,
  X,
} from 'lucide-react';

import UserAvatar from '../common/UserAvatar';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from '../../lib/realtime';

const roleLabels = {
  admin: 'System Administrator',
  police: 'Traffic Police Officer',
  driver: 'Licensed Driver',
  owner: 'Vehicle Owner',
};

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-700',
  police: 'bg-blue-100 text-blue-700',
  driver: 'bg-green-100 text-green-700',
  owner: 'bg-purple-100 text-purple-700',
};

const getId = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item._id || item.id || '';
};

const extractNotifications = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.notifications)) return payload.notifications;
  if (Array.isArray(payload.data?.notifications)) return payload.data.notifications;

  return [];
};

const formatNotificationTime = (value) => {
  if (!value) return 'Just now';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

const getSeverityClass = (severity = '') => {
  const value = String(severity).toLowerCase();

  if (value === 'critical') return 'bg-red-50 text-red-600';
  if (value === 'warning') return 'bg-orange-50 text-orange-600';
  if (value === 'success') return 'bg-green-50 text-green-600';

  return 'bg-blue-50 text-blue-600';
};

const getSeverityIcon = (severity = '') => {
  const value = String(severity).toLowerCase();

  if (value === 'critical') return AlertTriangle;
  if (value === 'warning') return Clock;
  if (value === 'success') return CheckCircle;

  return Info;
};

const normalizeNotificationLink = (link = '') => {
  const cleanLink = String(link || '').trim();

  if (!cleanLink) return '';

  const aliases = {
    license: 'my-license',
    violations: 'my-violations',
    cases: 'all-cases',
    'my-cases': 'my-cases',
  };

  return aliases[cleanLink] || cleanLink;
};

const sortNotificationsByTime = (items = []) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();

    return bTime - aTime;
  });
};

const upsertNotification = (items = [], notification) => {
  if (!notification) {
    return items;
  }

  const notificationId = getId(notification);

  const filteredItems = items.filter((item) => {
    const itemId = getId(item);

    if (notificationId && itemId) {
      return itemId !== notificationId;
    }

    return item?.dedupeKey !== notification?.dedupeKey;
  });

  return sortNotificationsByTime([notification, ...filteredItems]).slice(0, 20);
};

export default function Navbar({
  onToggleSidebar,
  sidebarOpen = false,
  onNavigate = () => { },
}) {
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);
  const violations = useStore((state) => state.violations || []);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const dashboardRefreshTimerRef = useRef(null);
  const lastNotificationFetchRef = useRef(0);

  const refreshDashboardDataAfterNotification = useCallback(() => {
    if (dashboardRefreshTimerRef.current) {
      window.clearTimeout(dashboardRefreshTimerRef.current);
    }

    dashboardRefreshTimerRef.current = window.setTimeout(() => {
      if (typeof fetchDashboardData === 'function') {
        fetchDashboardData().catch((error) => {
          console.error('Failed to refresh dashboard data after realtime notification:', error);
        });
      }
    }, 350);
  }, [fetchDashboardData]);

  const role = currentUser?.role || 'driver';
  const isAdmin = role === 'admin';

  const pendingCases = isAdmin
    ? violations.filter((violation) => String(violation.status || '').toLowerCase() === 'pending')
      .length
    : 0;

  const unreadBackendCount = notifications.filter(
    (notification) => String(notification.status || 'unread').toLowerCase() === 'unread'
  ).length;

  const totalUnreadCount = unreadBackendCount + pendingCases;

  const displayCount = totalUnreadCount > 9 ? '9+' : totalUnreadCount;

  const visibleNotifications = useMemo(() => {
    const items = [...notifications];

    if (isAdmin && pendingCases > 0) {
      items.unshift({
        _id: 'admin-pending-cases',
        title: 'Pending cases require review',
        message: `${pendingCases} pending case(s) need admin action.`,
        severity: 'warning',
        status: 'unread',
        link: 'all-cases',
        createdAt: new Date().toISOString(),
        isLocal: true,
      });
    }

    return items;
  }, [notifications, isAdmin, pendingCases]);

  const loadNotifications = async ({ silent = false, force = false } = {}) => {
    if (!currentUser || typeof api.getMyNotifications !== 'function') {
      return;
    }

    const now = Date.now();

    if (!force && lastNotificationFetchRef.current) {
      const diffMs = now - lastNotificationFetchRef.current;

      if (diffMs < 15000) {
        return;
      }
    }

    if (!silent) {
      setNotificationsLoading(true);
    }

    try {
      const response = await api.getMyNotifications(20);
      setNotifications(extractNotifications(response));
      lastNotificationFetchRef.current = Date.now();
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications({ silent: true, force: true });

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true, force: true });
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [currentUser?._id, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?._id && !currentUser?.id) {
      disconnectNotificationSocket();
      return undefined;
    }

    const socket = connectNotificationSocket();

    if (!socket) {
      return undefined;
    }

    const handleNewNotification = (payload = {}) => {
      const notification = payload.notification || payload.data?.notification;

      if (!notification) {
        return;
      }

      setNotifications((previous) => upsertNotification(previous, notification));
      refreshDashboardDataAfterNotification();
    };

    const handleUpdatedNotification = (payload = {}) => {
      const notification = payload.notification || payload.data?.notification;

      if (!notification) {
        return;
      }

      setNotifications((previous) => upsertNotification(previous, notification));

      const notificationType = String(notification.type || '').toLowerCase();

      if (
        [
          'case_created',
          'case_reviewed',
          'payment_completed',
          'assignment_request',
          'assignment_activated',
          'assignment_accepted',
          'assignment_rejected',
          'assignment_removed',
          'auto_violation_created',
          'license_expiry_reminder',
          'license_expired',
        ].includes(notificationType)
      ) {
        refreshDashboardDataAfterNotification();
      }
    };

    const handleReadAllNotifications = (payload = {}) => {
      const readAt = payload.readAt || new Date().toISOString();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          status: 'read',
          readAt,
        }))
      );
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:updated', handleUpdatedNotification);
    socket.on('notifications:read-all', handleReadAllNotifications);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:updated', handleUpdatedNotification);
      socket.off('notifications:read-all', handleReadAllNotifications);
    };
  }, [currentUser?._id, currentUser?.id, refreshDashboardDataAfterNotification]);

  useEffect(() => {
    return () => {
      if (dashboardRefreshTimerRef.current) {
        window.clearTimeout(dashboardRefreshTimerRef.current);
      }
    };
  }, []);

  const closeMenus = () => {
    setDropdownOpen(false);
    setNotifOpen(false);
  };

  const handleProfileClick = () => {
    onNavigate('profile');
    closeMenus();
  };

  const handleNotificationClick = async (notification) => {
    const notificationId = getId(notification);

    if (!notification?.isLocal && notificationId && notification.status !== 'read') {
      try {
        await api.markNotificationRead(notificationId);
        setNotifications((previous) =>
          previous.map((item) =>
            getId(item) === notificationId
              ? { ...item, status: 'read', readAt: new Date().toISOString() }
              : item
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    const targetPage = normalizeNotificationLink(notification.link);

    if (targetPage) {
      onNavigate(targetPage);
    }

    closeMenus();
  };

  const handleMarkAllRead = async () => {
    if (typeof api.markAllNotificationsRead !== 'function') {
      return;
    }

    try {
      await api.markAllNotificationsRead();

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          status: 'read',
          readAt: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleLogout = () => {
    disconnectNotificationSocket();
    logout();
    closeMenus();
  };

  return (
    <nav className="stves-navbar bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="stves-navbar-inner flex items-center justify-between h-full px-4">
        <div className="stves-navbar-left flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="stves-navbar-menu-button p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="stves-navbar-brand flex items-center gap-2"
          >
            <div className="stves-navbar-logo w-9 h-9 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>

            <div className="hidden sm:block text-left">
              <h1 className="text-lg font-bold text-gray-800 leading-tight">
                STVES
              </h1>

              <p className="text-[10px] text-gray-400 leading-tight -mt-0.5">
                Smart Traffic Verification
              </p>
            </div>
          </button>
        </div>

        <div className="stves-navbar-right flex items-center gap-2">
          <div className="stves-navbar-notification relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((open) => !open);
                setDropdownOpen(false);

                if (!notifOpen) {
                  const shouldReloadNotifications =
                    notifications.length === 0 ||
                    Date.now() - lastNotificationFetchRef.current > 30000;

                  if (shouldReloadNotifications) {
                    loadNotifications({
                      silent: notifications.length > 0,
                      force: true,
                    });
                  }
                }
              }}
              className="stves-navbar-icon-button p-2 rounded-lg hover:bg-gray-100 relative"
              aria-label="Open notifications"
            >
              <Bell size={20} className="text-gray-600" />

              {totalUnreadCount > 0 && (
                <span className="stves-navbar-badge absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse-badge">
                  {displayCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="stves-navbar-dropdown stves-notification-dropdown absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Notifications
                    </p>

                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalUnreadCount > 0
                        ? `${totalUnreadCount} unread notification(s)`
                        : 'No unread notifications'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadNotifications({ force: true })}
                      disabled={notificationsLoading}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-50"
                      title="Refresh notifications"
                    >
                      <RefreshCw
                        size={15}
                        className={notificationsLoading ? 'animate-spin' : ''}
                      />
                    </button>

                    {unreadBackendCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-[#0f4c81] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="stves-notification-list max-h-96 overflow-y-auto">
                  {notificationsLoading && visibleNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      Loading notifications...
                    </div>
                  ) : visibleNotifications.length > 0 ? (
                    visibleNotifications.map((notification) => {
                      const NotificationIcon = getSeverityIcon(notification.severity);
                      const isUnread =
                        String(notification.status || 'unread').toLowerCase() === 'unread';

                      return (
                        <button
                          key={getId(notification) || notification.title}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`stves-notification-item w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${isUnread ? 'bg-blue-50/40' : 'bg-white'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getSeverityClass(
                                notification.severity
                              )}`}
                            >
                              <NotificationIcon size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                  {notification.title || 'STVES Notification'}
                                </p>

                                {isUnread && (
                                  <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                              </div>

                              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                                {notification.message || 'Notification details unavailable.'}
                              </p>

                              <p className="text-[11px] text-gray-400 mt-2">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="stves-navbar-user relative">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((open) => !open);
                setNotifOpen(false);
              }}
              className="stves-navbar-user-button flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Open user menu"
            >
              <UserAvatar
                user={currentUser}
                size="xs"
                radius="circle"
                className="stves-navbar-user-avatar"
              />

              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {currentUser?.name || 'User'}
                </p>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleBadgeColors[role] || 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {roleLabels[role] || 'STVES User'}
                </span>
              </div>

              <ChevronDown size={16} className="text-gray-400 hidden md:block" />
            </button>

            {dropdownOpen && (
              <div className="stves-navbar-dropdown absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700">
                    {currentUser?.name || 'User'}
                  </p>

                  <p className="text-xs text-gray-400 truncate">
                    {currentUser?.email || ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(dropdownOpen || notifOpen) && (
        <button
          type="button"
          aria-label="Close open menu"
          className="stves-navbar-click-layer fixed inset-0 z-40 cursor-default"
          onClick={closeMenus}
        />
      )}
    </nav>
  );
}