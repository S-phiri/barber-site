import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";


interface GallerySectionProps {
  images?: {
    src: string;
    alt: string;
  }[];
}

const GallerySection = ({
  images = [
  { src: "/gallery/fade1.png", alt: "Fade haircut style" },
  { src: "/gallery/fade2.png", alt: "Clean cut with beard trim" },
  { src: "/gallery/fade3.png", alt: "Classic taper fade" },
  { src: "/gallery/fade4.png", alt: "Modern pompadour style" },
  { src: "/gallery/fade5.png", alt: "Textured crop haircut" },
  { src: "/gallery/fade6.png", alt: "Skin fade with line design" },
],

}: GallerySectionProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section className="py-20 px-4 bg-silver-50" id="gallery">
      <div className="container mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center text-black tracking-tight">
          <span className="text-silver-600">Our</span> Signature Cuts
        </h2>
        <div className="h-1 w-32 bg-gradient-to-r from-silver-400 to-black mx-auto mb-8"></div>
        <p className="text-silver-600 text-center max-w-3xl mx-auto mb-16 text-lg leading-relaxed">
          Browse through our gallery of premium haircuts and styles. We take
          pride in delivering precision cuts that make you look and feel your
          best.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <motion.div
              key={index}
              className="relative overflow-hidden rounded-lg shadow-lg bg-white cursor-pointer border border-silver-200 hover:border-silver-400"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={() => setSelectedImage(image.src)}
            >
              <div className="aspect-w-4 aspect-h-3 w-full">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end">
                <div className="p-6 w-full">
                  <p className="text-white font-semibold text-lg">{image.alt}</p>
                  <p className="text-silver-300 text-sm mt-1">Click to view</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent className="max-w-4xl bg-white border border-silver-300 p-1">
            <div className="relative w-full">
              <img
                src={selectedImage || ""}
                alt="Selected haircut style"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-16 text-center">
          <p className="text-black font-semibold mb-6 text-lg">
            Like what you see?
          </p>
          <Link to="/booking" className="bg-black text-white px-8 py-4 rounded-sm hover:bg-charcoal-800 transition-colors font-semibold text-lg uppercase tracking-wide shadow-lg hover:shadow-xl">Book Now</Link>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
