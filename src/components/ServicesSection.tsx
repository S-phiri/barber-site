import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Scissors, Sparkles, Baby, Droplet } from "lucide-react";

interface ServiceProps {
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
}

const ServiceCard = (
  { title, description, price, icon }: ServiceProps = {
    title: "Service",
    description: "Service description",
    price: "R0",
    icon: <Scissors className="h-6 w-6" />,
  },
) => {
  return (
    <Card className="bg-white border border-silver-200 text-black hover:shadow-xl hover:shadow-silver-300/20 transition-all duration-500 hover:border-silver-400 hover:-translate-y-2 group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-3">
          <CardTitle className="text-xl font-bold text-black group-hover:text-charcoal-700 transition-colors">
            {title}
          </CardTitle>
          <div className="text-silver-500 group-hover:text-silver-700 transition-colors p-2 bg-silver-50 rounded-lg">
            {icon}
          </div>
        </div>
        <CardDescription className="text-silver-600 leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-silver-300 to-transparent my-4"></div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-0">
        <span className="text-3xl font-bold text-black group-hover:text-charcoal-700 transition-colors">{price}</span>
        <div className="text-xs text-silver-500 uppercase tracking-wide font-medium">
          Book Now
        </div>
      </CardFooter>
    </Card>
  );
};

const ServicesSection = () => {
  const services: ServiceProps[] = [
    {
      title: "Fade",
      description: "Clean, precise fade haircut tailored to your style",
      price: "R220",
      icon: <Scissors className="h-6 w-6" />,
    },
    {
      title: "Beard Trim",
      description: "Expert beard shaping and styling for a sharp look",
      price: "R120",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: "Kids Cut",
      description: "Gentle, stylish haircuts for the little ones",
      price: "R140",
      icon: <Baby className="h-6 w-6" />,
    },
    {
      title: "Hot Towel Shave",
      description: "Luxurious traditional hot towel shave experience",
      price: "R200",
      icon: <Droplet className="h-6 w-6" />,
    },
  ];

  return (
    <section id="services" className="bg-white py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
            Our Services
          </h2>
          <div className="h-1 w-32 bg-gradient-to-r from-black to-silver-400 mx-auto mb-6"></div>
          <p className="text-silver-600 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Premium haircut services with attention to detail and precision. 
            Experience the finest in men's grooming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              price={service.price}
              icon={service.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
