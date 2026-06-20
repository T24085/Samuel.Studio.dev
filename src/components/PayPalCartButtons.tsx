import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

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

function findClickableElement(root: HTMLElement | ShadowRoot | null): HTMLElement | null {
  if (!root) {
    return null;
  }

  const clickableSelector = 'button, input[type="button"], input[type="submit"], [role="button"]';

  if (root instanceof HTMLElement && root.matches(clickableSelector)) {
    return root;
  }

  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }

    if (child.matches(clickableSelector)) {
      return child;
    }

    const shadowTarget = findClickableElement(child.shadowRoot);
    if (shadowTarget) {
      return shadowTarget;
    }

    const nestedTarget = findClickableElement(child);
    if (nestedTarget) {
      return nestedTarget;
    }
  }

  return null;
}

function clickHiddenPayPalButton(container: HTMLDivElement | null) {
  const element = container?.querySelector('paypal-add-to-cart-button');

  if (element instanceof HTMLElement) {
    const target = findClickableElement(element.shadowRoot) ?? findClickableElement(element);

    if (target) {
      target.click();
      return true;
    }

    element.click();
    return true;
  }

  return false;
}

export function PayPalCartButtons({ addToCartId, label = 'Add to cart', variant = 'primary', onClick }: PayPalCartButtonsProps) {
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
          onClick?.();

          const container = hiddenButtonRef.current;

          if (clickHiddenPayPalButton(container)) {
            return;
          }

          if (initializePayPalCartButton(addToCartId, 'AddToCart')) {
            let attempts = 0;

            const tryClick = () => {
              if (clickHiddenPayPalButton(container)) {
                return;
              }

              attempts += 1;

              if (attempts < 30) {
                window.requestAnimationFrame(tryClick);
              }
            };

            window.requestAnimationFrame(tryClick);
          }
        }}
      >
        {label}
        <ArrowUpRight size={16} />
      </button>
      <div
        ref={hiddenButtonRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
        }}
      >
        <paypal-add-to-cart-button data-id={addToCartId} />
      </div>
    </div>
  );
}
