export type BookingProvider = 'google-embed' | 'google-api' | 'booksy' | 'custom';

export const bookingProvider: BookingProvider =
  (import.meta.env?.VITE_BOOKING_PROVIDER as BookingProvider) || 'google-embed';

export const isGoogleEmbed = () => bookingProvider === 'google-embed';
export const isGoogleApi = () => bookingProvider === 'google-api';
export const isBooksy = () => bookingProvider === 'booksy';
export const isCustom = () => bookingProvider === 'custom';
