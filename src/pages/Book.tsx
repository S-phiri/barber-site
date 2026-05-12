import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";

export default function Book() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBookAppointment = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/book");
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black">Book Your Appointment</h1>
            <p className="text-silver-600 mt-2">Schedule your visit with our professional barbers</p>
          </div>

          {/* Booking Options */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Choose Your Booking Method</CardTitle>
              <CardDescription>Select how you'd like to book your appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Online Booking */}
                <Card className="border-2 hover:border-blue-500 transition-colors cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Online Booking</h3>
                      <p className="text-gray-600 mb-4">
                        Book your appointment online with our easy-to-use booking system.
                        Choose your service, date, and time.
                      </p>
                    </div>
                    <Button
                      onClick={handleBookAppointment}
                      className="w-full"
                      size="lg"
                    >
                      {user ? "Book Online" : "Login to Book"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Phone Booking */}
                <Card className="border-2 hover:border-green-500 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Call Us</h3>
                      <p className="text-gray-600 mb-4">
                        Prefer to speak with someone? Give us a call and we'll help you
                        schedule your appointment.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => window.open('tel:+27123456789')}
                    >
                      Call Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Services Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Our Services</CardTitle>
              <CardDescription>Professional grooming services tailored to your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Haircut & Styling</h4>
                  <p className="text-gray-600 text-sm mb-2">Professional haircuts and styling</p>
                  <p className="text-green-600 font-semibold">From R150</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Beard Trim</h4>
                  <p className="text-gray-600 text-sm mb-2">Precision beard trimming and shaping</p>
                  <p className="text-green-600 font-semibold">From R80</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Haircut + Beard</h4>
                  <p className="text-gray-600 text-sm mb-2">Complete grooming package</p>
                  <p className="text-green-600 font-semibold">From R200</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Get in touch with us</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Address</h4>
                  <p className="text-gray-600">
                    123 Main Street<br />
                    Cape Town, 8001<br />
                    South Africa
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Hours</h4>
                  <p className="text-gray-600">
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 9:00 AM - 4:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
