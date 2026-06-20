import type { HTMLAttributes } from 'react';

type PayPalCartElementProps = HTMLAttributes<HTMLElement> & {
  'data-id'?: string;
};

declare global {
  interface Window {
    cartPaypal?: {
      AddToCart: (config: { id: string }) => void;
      Cart: (config: { id: string }) => void;
    };
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'paypal-add-to-cart-button': PayPalCartElementProps;
      'paypal-cart-button': PayPalCartElementProps;
    }
  }
}

export {};
