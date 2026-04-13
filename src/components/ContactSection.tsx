import React from "react";
import { MapPin, Phone, Clock, Instagram } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ContactSectionProps {
  address?: string;
  phone?: string;
  hours?: string[];
  instagramHandle?: string;
  mapLocation?: string;
}

const ContactSection = ({
  address = "Draper square shop no 7, Claremont, Cape Town, Western Cape 7708",
  phone = "+27 670 238 197",
  hours = ["Mon-Fri: 9am - 7pm", "Saturday: 9am - 5pm", "Sunday: Closed"],
  instagramHandle = "@BBIT_Ramad",
  mapLocation = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53311.97392901872!2d18.4326!3d-33.9258!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1dcc5d996c11ccb9%3A0x5c2b8d0288ac9f23!2sSouthern%20Suburbs%2C%20Cape%20Town!5e0!3m2!1sen!2sza!4v1624523456789!5m2!1sen!2sza",
}: ContactSectionProps) => {
  return (
    <section id="contact" className="bg-[var(--bg-primary)] text-[var(--text-primary)] py-20 px-4 border-t border-[var(--border-color)]">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center tracking-tight">
          <span className="text-[var(--text-secondary)]">Find</span> Us
        </h2>
        <div className="h-1 w-32 bg-gradient-to-r from-[var(--text-secondary)] to-[var(--text-primary)] mx-auto mb-12"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Map */}
          <div className="w-full h-[450px] rounded-sm overflow-hidden shadow-2xl border border-[var(--border-color)] hover:border-[var(--text-secondary)] transition-colors">
            <iframe
              src={mapLocation}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="BBIT Location"
              className="bg-gray-200"
            />
          </div>

          {/* Contact Info */}
          <div className="flex flex-col justify-center">
            <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-secondary)] transition-colors rounded-sm">
              <CardContent className="pt-8 pb-8">
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm">
                      <MapPin className="h-6 w-6 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-[var(--text-primary)]">Location</h3>
                      <p className="text-[var(--text-secondary)] text-lg">{address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm">
                      <Phone className="h-6 w-6 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-[var(--text-primary)]">Phone</h3>
                      <p className="text-[var(--text-secondary)] text-lg">
                        <a
                          href={`tel:${phone.replace(/\s+/g, "")}`}
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          {phone}
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm">
                      <Clock className="h-6 w-6 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-[var(--text-primary)]">Hours</h3>
                      <ul className="text-[var(--text-secondary)] space-y-1 text-lg">
                        {hours.map((hour, index) => (
                          <li key={index}>{hour}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm">
                      <Instagram className="h-6 w-6 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-[var(--text-primary)]">Instagram</h3>
                      <p className="text-[var(--text-secondary)] text-lg">
                        <a
                          href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          {instagramHandle}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Best Barber In Town. All rights
            reserved.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
