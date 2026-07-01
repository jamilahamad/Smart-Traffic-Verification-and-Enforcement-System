import useStore from './useStore';

export const useAuthStore = useStore;

export const selectCurrentUser = (state) => state.currentUser;
export const selectIsAuthenticated = (state) => state.isAuthenticated;
export const selectAuthLoading = (state) => state.authLoading;
export const selectLogin = (state) => state.login;
export const selectRegister = (state) => state.register;
export const selectLogout = (state) => state.logout;
export const selectInitAuth = (state) => state.initAuth;

export default useStore;