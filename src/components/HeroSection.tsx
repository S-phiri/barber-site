import React from "react";
import { Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { motion } from "framer-motion";

interface HeroSectionProps {
  whatsappNumber?: string;
}

const HeroSection = ({
  whatsappNumber = "+27670238197",
}: HeroSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    if (user) {
      navigate("/book");
    } else {
      navigate("/login?next=/book");
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-60px)] flex flex-col bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-black text-white overflow-hidden">
      {/* Background image */}
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

      {/* Side readability overlay */}
      <div className="absolute inset-0 z-[10] bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none" />

      {/* Bottom fade into page background */}
      <div
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 60%, var(--bg-primary) 100%)",
        }}
      />

      {/* Hero content — vertically centered above bottom fade */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 py-10 md:py-14 text-center">
        <div className="mb-10 w-56 h-40 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden">
          <img src="/logo1.png" alt="BBIT Logo" className="w-48 h-48 object-contain" />
        </div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 tracking-tight leading-tight">
            <span className="text-white">A cut above the rest.</span>
          </h1>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-light mb-10 text-silver-200 tracking-wide">
            Best Barber in Town
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <button
            type="button"
            onClick={handleBookAppointment}
            className="bg-white text-black px-8 py-4 rounded-sm hover:bg-silver-200 transition-colors duration-200 font-semibold text-lg uppercase tracking-wide shadow-xl"
          >
            Book Appointment
          </button>
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-sm hover:bg-white hover:text-black transition-colors duration-200 font-semibold text-lg uppercase tracking-wide"
          >
            <Phone className="inline mr-2 h-5 w-5" /> WhatsApp
          </a>
        </motion.div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
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
