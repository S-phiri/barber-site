import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, User, Phone, Mail, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth";
import { useServices } from "@/hooks/useServices";
import { useBarbers } from "@/hooks/useBarbers";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { isGoogleEmbed } from "@/lib/bookingProvider";
import { GoogleApptModal } from "@/components/GoogleApptModal";
import { getBarberApptUrl, type BarberKey } from "@/lib/barbers";
import { createCheckout, type BookingData as PayFastBookingData } from "@/lib/api";

interface BookingFormData {
  serviceId: string;
  barberId: string;
  barberKey: BarberKey | null; // For Google embed
  date: Date;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

export default function GoogleCalendarBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { services } = useServices();
  const { barbers } = useBarbers();
  
  const [booking, setBooking] = useState<BookingFormData>({
    serviceId: "",
    barberId: "",
    barberKey: null,
    date: new Date(),
    time: "",
    customerName: user?.username || "",
    customerPhone: "",
    customerEmail: user?.email || "",
    notes: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleServiceChange = (serviceId: string) => {
    setBooking(prev => ({ ...prev, serviceId }));
    setStep(2);
  };

  const handleBarberChange = (barberId: string) => {
    // Map barber ID to barber key based on actual barber data
    console.log('Selected barber ID:', barberId);
    
    // For now, we'll map any barber to 'ramad' since we only have one Google appointment schedule
    // In the future, you'd map each barber ID to their specific appointment schedule
    const barberKey = 'ramad'; // All barbers use Ramad's appointment schedule for now
    console.log('Mapped barber key:', barberKey);
    
    setBooking(prev => ({ ...prev, barberId, barberKey }));
    setStep(3);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBooking(prev => ({ ...prev, date }));
      // For Google embed, skip directly to time selection (step 4)
      if (isGoogleEmbed()) {
        setStep(4);
      } else {
        setStep(4);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setBooking(prev => ({ ...prev, time }));
    setStep(5);
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setBooking(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenGoogleModal = () => {
    console.log('Opening Google modal, barberKey:', booking.barberKey);
    
    if (!booking.barberKey) {
      console.log('No barber key found');
      toast({
        title: "Error",
        description: "Please select a barber first.",
        variant: "destructive",
      });
      return;
    }
    
    const apptUrl = getBarberApptUrl(booking.barberKey);
    console.log('Appointment URL:', apptUrl);
    
    if (!apptUrl) {
      console.log('No appointment URL found');
      toast({
        title: "Error",
        description: "Appointment scheduling is not available for this barber.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Opening modal with URL:', apptUrl);
    setIsGoogleModalOpen(true);
  };

  const handleCloseGoogleModal = () => {
    setIsGoogleModalOpen(false);
    // After modal closes, proceed to step 5 (details)
    setStep(5);
  };

  const handleSubmitBooking = async () => {
    // For Google embed mode, we don't validate time since it's handled externally
    const requiredFields = isGoogleEmbed() 
      ? ['serviceId', 'barberId', 'customerName', 'customerPhone']
      : ['serviceId', 'barberId', 'time'];
      
    const missingFields = requiredFields.filter(field => !booking[field as keyof BookingFormData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Incomplete Booking",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get selected service and barber data
      const selectedService = services.find(s => s.id === booking.serviceId);
      const selectedBarber = barbers.find(b => b.id === booking.barberId);
      
      if (!selectedService || !selectedBarber) {
        throw new Error("Service or barber not found");
      }

      // Build booking data for PayFast
      const payFastBookingData: PayFastBookingData = {
        serviceId: booking.serviceId,
        serviceName: selectedService.name,
        price: selectedService.price || 150, // Default price if not set
        barberId: booking.barberId,
        barberName: selectedBarber.display_name,
        dateISO: booking.date.toISOString(),
        startISO: isGoogleEmbed() 
          ? new Date(booking.date.getTime() + 9 * 60 * 60 * 1000).toISOString() // Default to 9 AM if no time selected
          : `${booking.date.toISOString().split('T')[0]}T${booking.time}:00`,
        endISO: isGoogleEmbed()
          ? new Date(booking.date.getTime() + 9 * 60 * 60 * 1000 + (selectedService.duration_min || 60) * 60 * 1000).toISOString()
          : new Date(new Date(`${booking.date.toISOString().split('T')[0]}T${booking.time}:00`).getTime() + (selectedService.duration_min || 60) * 60 * 1000).toISOString(),
        customer: {
          name: booking.customerName,
          email: booking.customerEmail,
          phone: booking.customerPhone
        }
      };

      // Create PayFast checkout
      const { redirectUrl } = await createCheckout(payFastBookingData);
      
      toast({
        title: "Redirecting to Payment",
        description: "You will be redirected to complete your payment.",
      });
      
      // Redirect to PayFast
      window.location.href = redirectUrl;
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "There was an error creating your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTimes = () => {
    // Filter out past times for today
    if (booking.date.toDateString() === new Date().toDateString()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      return TIME_SLOTS.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      });
    }
    
    return TIME_SLOTS;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
          <p className="text-gray-600">Select your service, barber, and preferred time</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step >= stepNumber 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                )}>
                  {stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div className={cn(
                    "w-16 h-1 ml-2",
                    step > stepNumber ? "bg-blue-600" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-16 text-xs text-gray-500">
            <span>Service</span>
            <span>Barber</span>
            <span>Date</span>
            <span>Time</span>
            <span>Details</span>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && "Select Service"}
              {step === 2 && "Choose Barber"}
              {step === 3 && "Pick Date"}
              {step === 4 && "Select Time"}
              {step === 5 && "Your Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">What service would you like?</p>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <Card 
                      key={service.id}
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => handleServiceChange(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{service.name}</h3>
                            <p className="text-sm text-gray-600">{service.duration_min} minutes</p>
                          </div>
                          <div className="text-lg font-bold text-green-600">
                            R{(service.price_cents / 100).toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Barber Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Which barber would you prefer?</p>
                <div className="grid gap-3">
                  {barbers.map((barber) => (
                    <Card 
                      key={barber.id}
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => handleBarberChange(barber.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{barber.display_name}</h3>
                            <p className="text-sm text-gray-600">
                              {barber.specialties?.join(", ") || "General barbering"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back to Services
                </Button>
              </div>
            )}

            {/* Step 3: Date Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">When would you like your appointment?</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !booking.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {booking.date ? format(booking.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={booking.date}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back to Barber
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Time Selection */}
            {step === 4 && (
              <div className="space-y-4">
                {isGoogleEmbed() ? (
                  <>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <ExternalLink className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Pick Your Exact Time</h3>
                      <p className="text-gray-600">
                        Pick your exact date & time in the next step using Google's scheduling system.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Selected:</strong> {booking.date ? format(booking.date, "PPP") : "No date selected"}
                          <br />
                          <strong>Barber:</strong> {barbers.find(b => b.id === booking.barberId)?.display_name || "Not selected"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setStep(3)}>
                        Back to Date
                      </Button>
                      <Button 
                        onClick={handleOpenGoogleModal}
                        className="flex-1"
                        disabled={!booking.barberKey}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Pick Time on Google
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">What time works for you?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {getAvailableTimes().map((time) => (
                        <Button
                          key={time}
                          variant={booking.time === time ? "default" : "outline"}
                          onClick={() => handleTimeSelect(time)}
                          className="h-12"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {time}
                        </Button>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setStep(3)}>
                        Back to Date
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 5: Customer Details */}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Please confirm your details</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Full Name</Label>
                    <Input
                      id="customerName"
                      value={booking.customerName}
                      onChange={(e) => handleInputChange("customerName", e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={booking.customerPhone}
                      onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={booking.customerEmail}
                    onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Special Requests (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={booking.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any special requests or notes for your barber..."
                    rows={3}
                  />
                </div>

                {/* Booking Summary */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Booking Summary</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Service:</strong> {services.find(s => s.id === booking.serviceId)?.name}</p>
                      <p><strong>Barber:</strong> {barbers.find(b => b.id === booking.barberId)?.display_name}</p>
                      <p><strong>Date:</strong> {format(booking.date, "PPP")}</p>
                      <p><strong>Time:</strong> {booking.time}</p>
                      <p><strong>Price:</strong> R{(services.find(s => s.id === booking.serviceId)?.price_cents || 0) / 100}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    Back to Time
                  </Button>
                  <Button 
                    onClick={handleSubmitBooking}
                    disabled={loading || !booking.customerName || !booking.customerPhone}
                    className="flex-1"
                  >
                    {loading ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Google Appointment Modal */}
      {isGoogleEmbed() && booking.barberKey && (
        <GoogleApptModal
          apptUrl={getBarberApptUrl(booking.barberKey) || ''}
          open={isGoogleModalOpen}
          onClose={handleCloseGoogleModal}
          title={`Book with ${barbers.find(b => b.id === booking.barberId)?.display_name || 'Barber'}`}
        />
      )}
    </div>
  );
}
