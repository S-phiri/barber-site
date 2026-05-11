import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scissors, Sparkles, Palette } from "lucide-react";

interface ServiceProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ServiceCard = (
  { title, description, icon }: ServiceProps = {
    title: "Service",
    description: "Service description",
    icon: <Scissors className="h-6 w-6" />,
  },
) => {
  return (
    <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:shadow-xl transition-all duration-500 hover:border-[var(--text-secondary)] hover:-translate-y-2 group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-3">
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] group-hover:opacity-90 transition-colors">
            {title}
          </CardTitle>
          <div className="text-[var(--text-secondary)] group-hover:opacity-80 transition-colors p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
            {icon}
          </div>
        </div>
        <CardDescription className="text-[var(--text-secondary)] leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent my-4"></div>
      </CardContent>
      <CardFooter className="flex justify-end items-center pt-0">
        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-medium">
          Book Now
        </div>
      </CardFooter>
    </Card>
  );
};

const ServicesSection = () => {
  const services: ServiceProps[] = [
    {
      title: "Beard Trim",
      description: "Expert beard shaping and styling — 30 minutes",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: "Haircut",
      description: "Full precision cut and finish — 60 minutes",
      icon: <Scissors className="h-6 w-6" />,
    },
    {
      title: "Dye + Haircut",
      description: "Colour treatment with full haircut — 90 minutes",
      icon: <Palette className="h-6 w-6" />,
    },
  ];

  return (
    <section id="services" className="bg-[var(--bg-primary)] py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
            Our Services
          </h2>
          <div className="h-1 w-32 bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] mx-auto mb-6"></div>
          <p className="text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Premium haircut services with attention to detail and precision. 
            Experience the finest in men's grooming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              icon={service.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
