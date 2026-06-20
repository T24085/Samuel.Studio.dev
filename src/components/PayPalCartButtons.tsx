import { ArrowUpRight } from 'lucide-react';
import { useEffect } from 'react';

type PayPalCartButtonsProps = {
  addToCartId: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
};

function initializePayPalCartButton(buttonId: string, action: 'AddToCart' | 'Cart') {
  const cart = window.cartPaypal;

  if (!cart) {
    return false;
  }

  cart[action]({ id: buttonId });
  return true;
}

export function PayPalCartButtons({ addToCartId, label = 'Add to cart', variant = 'primary', onClick }: PayPalCartButtonsProps) {
  useEffect(() => {
    let timer: number | null = null;

    const tryInitialize = () => {
      const addReady = initializePayPalCartButton(addToCartId, 'AddToCart');
      if (addReady && timer !== null) {
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
  }, [addToCartId]);

  return (
    <div
      className="paypal-cart-actions"
      onClick={() => {
        onClick?.();
      }}
    >
      <div className={`button button--${variant} button--full paypal-cart-actions__shell`} aria-hidden="true">
        {label}
        <ArrowUpRight size={16} />
      </div>
      <div
        className="paypal-cart-actions__control"
        aria-hidden="true"
      >
        <paypal-add-to-cart-button data-id={addToCartId} />
      </div>
    </div>
  );
}
