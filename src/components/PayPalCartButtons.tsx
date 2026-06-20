import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

type PayPalCartButtonsProps = {
  addToCartId: string;
  label?: string;
  variant?: 'primary' | 'secondary';
};

function initializePayPalCartButton(buttonId: string, action: 'AddToCart' | 'Cart') {
  const cart = window.cartPaypal;

  if (!cart) {
    return false;
  }

  cart[action]({ id: buttonId });
  return true;
}

function clickHiddenPayPalButton(container: HTMLDivElement | null) {
  const button = container?.querySelector('button');

  if (button instanceof HTMLButtonElement) {
    button.click();
    return true;
  }

  container?.click();
  return false;
}

export function PayPalCartButtons({ addToCartId, label = 'Add to cart', variant = 'primary' }: PayPalCartButtonsProps) {
  const hiddenButtonRef = useRef<HTMLDivElement | null>(null);

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
    <div className="paypal-cart-actions">
      <button
        className={`button button--${variant} button--full`}
        type="button"
        onClick={() => {
          if (!clickHiddenPayPalButton(hiddenButtonRef.current)) {
            initializePayPalCartButton(addToCartId, 'AddToCart');
            window.setTimeout(() => {
              clickHiddenPayPalButton(hiddenButtonRef.current);
            }, 0);
          }
        }}
      >
        {label}
        <ArrowUpRight size={16} />
      </button>
      <div ref={hiddenButtonRef} className="sr-only" aria-hidden="true">
        <paypal-add-to-cart-button data-id={addToCartId} />
      </div>
    </div>
  );
}
