export type BookingProvider = 'google-embed' | 'google-api' | 'fresha' | 'booksy' | 'custom';

export const bookingProvider: BookingProvider =
  (import.meta.env?.VITE_BOOKING_PROVIDER as BookingProvider) || 'google-embed';

export const isGoogleEmbed = () => bookingProvider === 'google-embed';
export const isGoogleApi = () => bookingProvider === 'google-api';
export const isFresha = () => bookingProvider === 'fresha';
export const isBooksy = () => bookingProvider === 'booksy';
export const isCustom = () => bookingProvider === 'custom';
