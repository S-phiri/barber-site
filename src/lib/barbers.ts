export const BARBERS = {
  ramad: {
    name: 'Ramad',
    apptUrl: import.meta.env.VITE_GCAL_APPT_RAMAD,
    embedUrl: import.meta.env.VITE_GCAL_EMBED_RAMAD, // optional
  },
  // Add more barbers here as needed
  // example: {
  //   name: 'Example Barber',
  //   apptUrl: import.meta.env.VITE_GCAL_APPT_EXAMPLE,
  //   embedUrl: import.meta.env.VITE_GCAL_EMBED_EXAMPLE,
  // },
} as const;

export type BarberKey = keyof typeof BARBERS;

export function getBarberApptUrl(barberKey: BarberKey): string | undefined {
  const barber = BARBERS[barberKey];
  if (!barber?.apptUrl) {
    console.warn(`Missing appointment URL for barber: ${barberKey}`);
    return undefined;
  }
  return barber.apptUrl;
}

export function getBarberEmbedUrl(barberKey: BarberKey): string | undefined {
  const barber = BARBERS[barberKey];
  if (!barber?.embedUrl) {
    console.warn(`Missing embed URL for barber: ${barberKey}`);
    return undefined;
  }
  return barber.embedUrl;
}

export function getBarberName(barberKey: BarberKey): string {
  return BARBERS[barberKey]?.name || barberKey;
}
