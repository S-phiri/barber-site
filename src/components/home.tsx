import React from "react";
import HeroSection from "./HeroSection";
import GallerySection from "./GallerySection";
import ServicesSection from "./ServicesSection";
import ContactSection from "./ContactSection";

function Home() {
  const handleNavigate = (section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <HeroSection onNavigate={handleNavigate} whatsappNumber="+27123456789" />
      <GallerySection />
      <ServicesSection />
      <ContactSection />
    </div>
  );
}

export default Home;
