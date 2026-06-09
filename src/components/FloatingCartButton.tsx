import { useEffect } from 'react';

const floatingCartButtonId = 'pp-floating-cart';

function initializeFloatingCartButton(buttonId: string) {
  const cart = window.cartPaypal;

  if (!cart) {
    return false;
  }

  cart.Cart({ id: buttonId });
  return true;
}

export function FloatingCartButton() {
  useEffect(() => {
    let timer: number | null = null;

    const tryInitialize = () => {
      const ready = initializeFloatingCartButton(floatingCartButtonId);

      if (ready && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    tryInitialize();

    if (!window.cartPaypal) {
      timer = window.setInterval(tryInitialize, 100);
    }

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <div className="paypal-floating-cart" aria-label="Floating cart">
      <paypal-cart-button data-id={floatingCartButtonId} />
    </div>
  );
}
