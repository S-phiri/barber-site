import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { checkout } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { track } from "@/lib/analytics";

interface CheckoutButtonProps {
  bookingId: number;
  disabled?: boolean;
  className?: string;
}

export function CheckoutButton({
  bookingId,
  disabled = false,
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);
      track("checkout_initiated", { booking_id: bookingId });

      const response = await checkout({ booking_id: bookingId });

      // Open the checkout URL in the same window
      window.location.href = response.redirect_url;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Checkout failed";
      toast({
        title: "Checkout Error",
        description: errorMessage,
        variant: "destructive",
      });
      track("checkout_failed", { booking_id: bookingId, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={className}
      size="lg"
    >
      {loading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Processing...
        </>
      ) : (
        "Pay Now"
      )}
    </Button>
  );
}
