import { useEffect, useRef } from 'react';

type PayPalSubscriptionButtonProps = {
  planId: string;
};

type PayPalButtonsInstance = {
  render: (target: HTMLDivElement) => void | Promise<void>;
};

function initializePayPalSubscriptionButton(container: HTMLDivElement | null, planId: string) {
  const paypal = window.paypal;

  if (!paypal || !container) {
    return false;
  }

  container.innerHTML = '';

  const button = paypal.Buttons({
    style: {
      shape: 'rect',
      color: 'gold',
      layout: 'vertical',
      label: 'subscribe',
    },
    createSubscription(data, actions) {
      return actions.subscription.create({
        plan_id: planId,
      });
    },
    onApprove(data) {
      window.alert(data.subscriptionID);
    },
  }) as PayPalButtonsInstance;

  void button.render(container);
  return true;
}

export function PayPalSubscriptionButton({ planId }: PayPalSubscriptionButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: number | null = null;

    const tryInitialize = () => {
      const ready = initializePayPalSubscriptionButton(containerRef.current, planId);

      if (ready && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    tryInitialize();

    if (!window.paypal) {
      timer = window.setInterval(tryInitialize, 100);
    }

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [planId]);

  return <div ref={containerRef} className="paypal-subscription-actions" />;
}
