import { useEffect } from 'react';

const viewCartButtonId = 'pp-view-cart';

type PayPalCartButtonsProps = {
  addToCartId: string;
  showViewCartButton?: boolean;
};

function initializePayPalCartButton(buttonId: string, action: 'AddToCart' | 'Cart') {
  const cart = window.cartPaypal;

  if (!cart) {
    return false;
  }

  cart[action]({ id: buttonId });
  return true;
}

export function PayPalCartButtons({ addToCartId, showViewCartButton = false }: PayPalCartButtonsProps) {
  useEffect(() => {
    let timer: number | null = null;

    const tryInitialize = () => {
      const addReady = initializePayPalCartButton(addToCartId, 'AddToCart');
      const viewReady = !showViewCartButton || initializePayPalCartButton(viewCartButtonId, 'Cart');

      if (addReady && viewReady && timer !== null) {
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
  }, [addToCartId, showViewCartButton]);

  return (
    <div className="paypal-cart-actions">
      <paypal-add-to-cart-button data-id={addToCartId} />
      {showViewCartButton ? <paypal-cart-button data-id={viewCartButtonId} /> : null}
    </div>
  );
}
