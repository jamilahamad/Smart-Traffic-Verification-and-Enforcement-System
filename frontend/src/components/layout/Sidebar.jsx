import {
  BarChart3,
  Car,
  ClipboardList,
  FileWarning,
  History,
  IdCard,
  ImagePlus,
  LayoutDashboard,
  QrCode,
  Search,
  ShieldAlert,
  UserCircle,
  Users,
} from 'lucide-react';

import useStore from '../../store/useStore';
import UserAvatar from '../common/UserAvatar';

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'police', 'driver', 'owner'],
  },

  {
    id: 'verify',
    label: 'Verify Vehicle/Driver',
    icon: Search,
    roles: ['police'],
  },
  {
    id: 'qr-scan',
    label: 'QR Scanner',
    icon: QrCode,
    roles: ['police'],
  },
  {
    id: 'create-case',
    label: 'Create E-Challan',
    icon: FileWarning,
    roles: ['police'],
  },
  {
    id: 'my-cases',
    label: 'My Cases',
    icon: ClipboardList,
    roles: ['police'],
  },

  {
    id: 'all-cases',
    label: 'All Cases',
    icon: ClipboardList,
    roles: ['admin'],
  },
  {
    id: 'violation-management',
    label: 'Violation Management',
    icon: FileWarning,
    roles: ['admin'],
  },
  {
    id: 'manage-users',
    label: 'Manage Users',
    icon: Users,
    roles: ['admin'],
  },
  {
    id: 'manage-vehicles',
    label: 'Manage Vehicles',
    icon: Car,
    roles: ['admin'],
  },
  {
    id: 'blacklist',
    label: 'Blacklist & Suspensions',
    icon: ShieldAlert,
    roles: ['admin'],
  },
  {
    id: 'license-renewals',
    label: 'License Renewals',
    icon: IdCard,
    roles: ['admin'],
  },
  {
    id: 'brta-photos',
    label: 'BRTA Photos',
    icon: ImagePlus,
    roles: ['admin'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    icon: History,
    roles: ['admin'],
  },

  {
    id: 'my-license',
    label: 'My License',
    icon: IdCard,
    roles: ['driver'],
  },
  {
    id: 'my-violations',
    label: 'My Violations',
    icon: FileWarning,
    roles: ['driver'],
  },

  {
    id: 'my-vehicles',
    label: 'My Vehicles',
    icon: Car,
    roles: ['owner'],
  },
  {
    id: 'assign-drivers',
    label: 'Assign Drivers',
    icon: Users,
    roles: ['owner'],
  },
  {
    id: 'owner-violations',
    label: 'Vehicle Violations',
    icon: FileWarning,
    roles: ['owner'],
  },

  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: ['admin', 'police', 'driver', 'owner'],
  },
];

const getSections = (role, filteredItems) => {
  if (role === 'police') {
    return [
      {
        title: 'Overview',
        items: filteredItems.filter((item) => item.id === 'dashboard'),
      },
      {
        title: 'Enforcement',
        items: filteredItems.filter((item) =>
          ['verify', 'qr-scan', 'create-case', 'my-cases'].includes(item.id)
        ),
      },
      {
        title: 'Account',
        items: filteredItems.filter((item) => item.id === 'profile'),
      },
    ];
  }

  if (role === 'admin') {
    return [
      {
        title: 'Overview',
        items: filteredItems.filter((item) => item.id === 'dashboard'),
      },
      {
        title: 'Management',
        items: filteredItems.filter((item) =>
          [
            'all-cases',
            'violation-management',
            'manage-users',
            'manage-vehicles',
            'blacklist',
            'license-renewals',
            'brta-photos',
          ].includes(item.id)
        ),
      },
      {
        title: 'Reports',
        items: filteredItems.filter((item) =>
          ['analytics', 'activity-logs'].includes(item.id)
        ),
      },
      {
        title: 'Account',
        items: filteredItems.filter((item) => item.id === 'profile'),
      },
    ];
  }

  if (role === 'driver') {
    return [
      {
        title: 'Overview',
        items: filteredItems.filter((item) => item.id === 'dashboard'),
      },
      {
        title: 'My Info',
        items: filteredItems.filter((item) =>
          ['my-license', 'my-violations'].includes(item.id)
        ),
      },
      {
        title: 'Account',
        items: filteredItems.filter((item) => item.id === 'profile'),
      },
    ];
  }

  return [
    {
      title: 'Overview',
      items: filteredItems.filter((item) => item.id === 'dashboard'),
    },
    {
      title: 'Vehicle Management',
      items: filteredItems.filter((item) =>
        ['my-vehicles', 'assign-drivers', 'owner-violations'].includes(item.id)
      ),
    },
    {
      title: 'Account',
      items: filteredItems.filter((item) => item.id === 'profile'),
    },
  ];
};

export default function Sidebar({
  isOpen = false,
  currentPage = 'dashboard',
  onNavigate = () => { },
  onClose = () => { },
}) {
  const currentUser = useStore((state) => state.currentUser);

  const role = currentUser?.role || 'driver';
  const filteredItems = menuItems.filter((item) => item.roles.includes(role));
  const sections = getSections(role, filteredItems);

  const handleNavigate = (page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="stves-sidebar-overlay fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
    stves-sidebar fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200
    z-40 flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
  `}
      >
        <div className="stves-sidebar-menu flex-1 overflow-y-auto p-4 pb-4">
          {sections.map((section) => {
            if (section.items.length === 0) {
              return null;
            }

            return (
              <div key={section.title} className="stves-sidebar-section mb-4">
                <p className="stves-sidebar-section-title text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                  {section.title}
                </p>

                <div className="stves-sidebar-section-list space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={`
                          stves-sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                          transition-all duration-150
                          ${isActive
                            ? 'bg-[#0f4c81] text-white shadow-md shadow-blue-200'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="stves-sidebar-footer shrink-0 p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={currentUser}
              size="xs"
              radius="circle"
            />

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {currentUser?.name || 'User'}
              </p>

              <p className="text-[10px] text-gray-400 truncate">
                {currentUser?.badge || currentUser?.email || 'STVES User'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}