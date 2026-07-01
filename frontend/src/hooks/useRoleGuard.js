import useAuth from './useAuth';
import { canAccessPage } from '../constants/pages';
import { canAccessRole } from '../constants/roles';

export default function useRoleGuard(allowedRoles = [], page = '') {
  const { currentUser, isAuthenticated, role } = useAuth();

  const hasRoleAccess = canAccessRole(role, allowedRoles);
  const hasPageAccess = page ? canAccessPage(role, page) : true;

  return {
    user: currentUser,
    role,
    isAuthenticated,
    hasAccess: Boolean(isAuthenticated && hasRoleAccess && hasPageAccess),
    hasRoleAccess,
    hasPageAccess,
  };
}