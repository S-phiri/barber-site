import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { getBooking } from "@/lib/api";

interface Booking {
  id: string;
  status: 'pending' | 'paid' | 'failed';
  serviceName: string;
  barberName: string;
  dateISO: string;
  startISO: string;
  endISO: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  paidAt?: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const bookingData = await getBooking(bookingId);
        setBooking(bookingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
              <p className="text-gray-600 mb-4">
                {error || 'We could not find your booking. Please contact support if you believe this is an error.'}
              </p>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateISO: string) => {
    return new Date(dateISO).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (startISO: string, endISO: string) => {
    const start = new Date(startISO);
    const end = new Date(endISO);
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  };

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'paid':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'pending':
        return <Clock className="h-12 w-12 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Clock className="h-12 w-12 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (booking.status) {
      case 'paid':
        return {
          title: 'Payment Successful!',
          message: 'Your booking has been confirmed and payment processed.',
          color: 'text-green-600'
        };
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Your payment is being processed. You will receive a confirmation email shortly.',
          color: 'text-yellow-600'
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          message: 'There was an issue processing your payment. Please try again or contact support.',
          color: 'text-red-600'
        };
      default:
        return {
          title: 'Booking Status Unknown',
          message: 'Please contact support for assistance.',
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl ${statusInfo.color}`}>
            {statusInfo.title}
          </CardTitle>
          <p className="text-gray-600">{statusInfo.message}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Booking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Service:</span>
                <p className="text-gray-900">{booking.serviceName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Barber:</span>
                <p className="text-gray-900">{booking.barberName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <p className="text-gray-900">{formatDate(booking.dateISO)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Time:</span>
                <p className="text-gray-900">{formatTime(booking.startISO, booking.endISO)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer:</span>
                <p className="text-gray-900">{booking.customer.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <p className="text-gray-900">{booking.customer.email}</p>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {booking.status === 'paid' && booking.paidAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Payment Confirmation</h4>
              <p className="text-green-700 text-sm">
                Payment processed on {new Date(booking.paidAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/')} 
              className="flex-1"
            >
              Book Another Appointment
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              View Dashboard
            </Button>
          </div>

          {booking.status === 'failed' && (
            <div className="text-center">
              <Button 
                variant="destructive" 
                onClick={() => navigate('/book')}
              >
                Try Booking Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
