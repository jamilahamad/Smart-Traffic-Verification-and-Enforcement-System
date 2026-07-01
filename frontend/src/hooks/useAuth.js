import useStore from '../store/useStore';

export default function useAuth() {
  const currentUser = useStore((state) => state.currentUser);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const authLoading = useStore((state) => state.authLoading);
  const apiError = useStore((state) => state.apiError);

  const login = useStore((state) => state.login);
  const register = useStore((state) => state.register);
  const logout = useStore((state) => state.logout);
  const initAuth = useStore((state) => state.initAuth);
  const updateProfile = useStore((state) => state.updateProfile);

  return {
    currentUser,
    user: currentUser,
    role: currentUser?.role || '',
    isAuthenticated,
    authLoading,
    apiError,
    login,
    register,
    logout,
    initAuth,
    updateProfile,
  };
}