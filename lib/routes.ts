import { UserRole } from './types';

export const defaultRouteForRole = (role?: UserRole) => {
  if (role === 'admin') return '/admin';
  if (role === 'customer') return '/customer-home';
  return '/(tabs)';
};
