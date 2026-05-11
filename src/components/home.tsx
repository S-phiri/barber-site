import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import HeroSection from "./HeroSection";
import GallerySection from "./GallerySection";
import ServicesSection from "./ServicesSection";
import ContactSection from "./ContactSection";

function Home() {
  const location = useLocation();

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return;
    const el = document.getElementById(raw);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="w-full min-h-screen bg-[var(--bg-primary)]">
      <HeroSection whatsappNumber="+27670238197" />
      <GallerySection />
      <ServicesSection />
      <ContactSection />
    </div>
  );
}

export default Home;
