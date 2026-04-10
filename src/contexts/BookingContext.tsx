import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { BookingState, SlotHold, Service, TimeSlot, Barber } from "@/types/types";
import { getServices, getBarberBySlug, getSlots, createBooking } from "@/lib/api";

interface BookingContextType extends BookingState {
  barber: Barber | null;
  services: Service[];
  selectedService: Service | null;
  date: string;
  slots: TimeSlot[];
  servicesLoading: boolean;
  loading: {
    init: boolean;
    services: boolean;
    slots: boolean;
    booking: boolean;
  };
  setServiceId: (serviceId: number | null) => void;
  setBarberId: (barberId: number | null) => void;
  setSelectedService: (service: Service | null) => void;
  setDate: (date: string) => void;
  setSelectedDate: (selectedDate: string) => void;
  setHeldSlot: (heldSlot: SlotHold | null) => void;
  setSlotId: (slotId: number | null) => void;
  refreshSlots: () => Promise<void>;
  book: (slot: TimeSlot) => Promise<any>;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

const initialState: BookingState = {
  serviceId: null,
  barberId: null,
  slotId: null,
  selectedDate: new Date().toISOString().split("T")[0],
  heldSlot: null,
};

export function BookingProvider({ children }: BookingProviderProps) {
  const [state, setState] = useState<BookingState>(initialState);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState({
    init: true,
    services: false,
    slots: false,
    booking: false,
  });

  const setServiceId = (serviceId: number | null) => {
    setState((prev) => ({ ...prev, serviceId }));
  };

  const setBarberId = (barberId: number | null) => {
    setState((prev) => ({ ...prev, barberId }));
  };

  const setSlotId = (slotId: number | null) => {
    setState((prev) => ({ ...prev, slotId }));
  };

  const setSelectedDate = (selectedDate: string) => {
    setState((prev) => ({ ...prev, selectedDate }));
  };

  const setHeldSlot = (heldSlot: SlotHold | null) => {
    setState((prev) => ({ ...prev, heldSlot }));
  };

  const resetBooking = () => {
    setState(initialState);
    setSelectedService(null);
    setDate(new Date().toISOString().split("T")[0]);
    setSlots([]);
  };

  const refreshSlots = async () => {
    if (!barber || !selectedService || !date) {
      return;
    }

    try {
      setLoading(prev => ({ ...prev, slots: true }));
      const slotsData = await getSlots({
        barberId: barber.id,
        serviceId: selectedService.id,
        date: date
      });
      setSlots(slotsData);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setSlots([]);
    } finally {
      setLoading(prev => ({ ...prev, slots: false }));
    }
  };

  const book = async (slot: TimeSlot) => {
    if (!barber || !selectedService) {
      throw new Error('Barber and service must be selected');
    }

    try {
      setLoading(prev => ({ ...prev, booking: true }));
      const booking = await createBooking({
        barber_id: barber.id,
        service_id: selectedService.id,
        start: slot.start_ts
      });
      return booking;
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, booking: false }));
    }
  };

  // Initialize barber and services on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(prev => ({ ...prev, init: true }));
        
        // Fetch barber by slug "ramad"
        const barberData = await getBarberBySlug('ramad');
        setBarber(barberData);
        
        // Fetch services
        setLoading(prev => ({ ...prev, services: true }));
        const servicesData = await getServices();
        setServices(servicesData);
      } catch (error) {
        console.error('Failed to initialize booking context:', error);
      } finally {
        setLoading(prev => ({ ...prev, init: false, services: false }));
      }
    };

    initialize();
  }, []);

  // Refresh slots when service or date changes
  useEffect(() => {
    if (barber && selectedService && date) {
      refreshSlots();
    }
  }, [barber, selectedService, date]);

  const value: BookingContextType = {
    ...state,
    barber,
    services,
    selectedService,
    date,
    slots,
    servicesLoading: loading.services,
    loading,
    setServiceId,
    setBarberId,
    setSelectedService,
    setDate,
    setSelectedDate,
    setHeldSlot,
    setSlotId,
    refreshSlots,
    book,
    resetBooking,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
