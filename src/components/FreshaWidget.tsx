import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";

interface FreshaWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FreshaWidget({ isOpen, onClose }: FreshaWidgetProps) {
  const freshaUrl = import.meta.env.VITE_FRESHA_URL;
  
  if (!freshaUrl) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Not Available</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Booking system is not configured. Please contact us directly.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleBookNow = () => {
    // Open Fresha in a new tab to avoid CSP issues
    window.open(freshaUrl, '_blank', 'noopener,noreferrer');
    onClose(); // Close the modal after opening Fresha
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Your Appointment
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Book?</h3>
            <p className="text-gray-600 mb-6">
              Click below to open our booking system in a new tab where you can select your services and appointment time.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleBookNow}
              className="w-full"
              size="lg"
            >
              Open Booking System
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            You'll be redirected to Fresha to complete your booking
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
