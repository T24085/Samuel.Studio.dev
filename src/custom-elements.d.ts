declare global {
  interface PayPalSubscriptionActions {
    subscription: {
      create: (config: { plan_id: string }) => string | Promise<string>;
    };
  }

  interface PayPalButtonsConfig {
    style?: {
      shape?: 'rect' | 'pill';
      color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
      layout?: 'vertical' | 'horizontal';
      label?: 'subscribe' | 'pay' | 'buynow' | 'checkout';
    };
    createSubscription: (data: unknown, actions: PayPalSubscriptionActions) => string | Promise<string>;
    onApprove?: (data: { subscriptionID: string }, actions: unknown) => void;
  }

  interface PayPalButtonsInstance {
    render: (target: HTMLElement) => void | Promise<void>;
  }

  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => PayPalButtonsInstance;
    };
  }
}

export {};
