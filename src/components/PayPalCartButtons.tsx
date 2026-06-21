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
    <div className={`paypal-cart-actions paypal-cart-actions--${variant}`} onClick={() => onClick?.()}>
      <paypal-add-to-cart-button
        className={`paypal-cart-actions__button button button--${variant} button--full`}
        data-id={addToCartId}
        aria-label={label}
      />
    </div>
  );
}
