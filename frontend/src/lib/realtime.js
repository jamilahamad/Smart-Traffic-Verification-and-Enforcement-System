import { io } from 'socket.io-client';

import { API_BASE_URL, tokenStorage } from './api';

let socket = null;

const getSocketBaseUrl = () => {
  const apiBase = String(API_BASE_URL || '').replace(/\/$/, '');

  if (!apiBase || apiBase === '/api') {
    return window.location.origin;
  }

  return apiBase.replace(/\/api$/i, '');
};

export const connectNotificationSocket = () => {
  const token = tokenStorage.getToken();

  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getSocketBaseUrl(), {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (error) => {
    console.warn('Notification socket connection failed:', error?.message);
  });

  return socket;
};

export const disconnectNotificationSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getNotificationSocket = () => socket;