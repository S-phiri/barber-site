import React from "react";
import { Button } from "./ui/button";
import { Phone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { motion } from "framer-motion";


interface HeroSectionProps {
  onNavigate?: (section: string) => void;
  whatsappNumber?: string;
}

const HeroSection = ({
  onNavigate = () => {},
  whatsappNumber = "+27670238197",
}: HeroSectionProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    if (user) {
      navigate("/book");
    } else {
      navigate("/login?next=/book");
    }
  };

  return (
    <div className="relative w-full h-[700px] bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-black text-white overflow-hidden">
      {/* Background image with better overlay */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/gallery/barbershop.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(1.2) contrast(0.8)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-10" />

      {/* Navigation */}
      <nav className="relative z-20 flex justify-between items-center px-6 md:px-12 py-6">
        <div className="text-2xl font-bold text-white tracking-wider">BBIT</div>
        <div className="hidden md:flex space-x-8">
          <button
            onClick={() => onNavigate("gallery")}
            className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Gallery
          </button>
          <button
            onClick={() => onNavigate("services")}
            className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Services
          </button>
          <Link
            to="/products"
            className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Products
          </Link>
          <button
            onClick={() => onNavigate("contact")}
            className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide"
          >
            Contact
          </button>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide">
                Dashboard
              </Link>
              <button 
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white hover:text-silver-300 transition-colors font-medium text-sm uppercase tracking-wide">
                Sign In
              </Link>
              <Link to="/signup" className="bg-white text-black px-4 py-2 rounded-sm hover:bg-silver-200 transition-colors font-semibold text-sm uppercase tracking-wide">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-[calc(100%-80px)] px-6 text-center">
        {/* Logo */}
        <div className="mb-12 w-56 h-40 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden">
          <img
            src="/logo1.png"
            alt="BBIT Logo"
            className="w-48 h-48 object-contain"
          />
        </div>

        {/* Tagline */}
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
            <span className="text-white">A cut above the rest.</span>
          </h1>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-light mb-12 text-silver-200 tracking-wide">
            Best Barber in Town
          </h2>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <button 
            onClick={handleBookAppointment}
            className="bg-white text-black px-8 py-4 rounded-sm hover:bg-silver-200 transition-colors font-semibold text-lg uppercase tracking-wide shadow-xl"
          >
            Book Appointment
          </button>
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-sm hover:bg-white hover:text-black transition-colors font-semibold text-lg uppercase tracking-wide"
          >
            <Phone className="inline mr-2 h-5 w-5" /> WhatsApp
          </a>
        </motion.div>
      </div>

      {/* Sticky WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full shadow-2xl hover:bg-green-600 transition-all duration-300 hover:scale-110"
          aria-label="Book on WhatsApp"
        >
          <Phone className="h-7 w-7 text-white" />
        </a>
      </div>
    </div>
  );
};

export default HeroSection;
