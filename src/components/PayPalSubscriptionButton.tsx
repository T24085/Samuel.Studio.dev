import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

type PayPalSubscriptionButtonProps = {
  planId: string;
  label?: string;
  variant?: 'primary' | 'secondary';
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

function clickHiddenSubscriptionButton(container: HTMLDivElement | null) {
  const element = container?.querySelector('button');

  if (element instanceof HTMLButtonElement) {
    element.click();
    return true;
  }

  return false;
}

export function PayPalSubscriptionButton({ planId, label = 'Add subscription', variant = 'primary' }: PayPalSubscriptionButtonProps) {
  const hiddenButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: number | null = null;

    const tryInitialize = () => {
      const ready = initializePayPalSubscriptionButton(hiddenButtonRef.current, planId);

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
    };
  }, [planId]);

  return (
    <div className="paypal-cart-actions">
      <button
        className={`button button--${variant} button--full`}
        type="button"
        onClick={() => {
          if (!clickHiddenSubscriptionButton(hiddenButtonRef.current)) {
            initializePayPalSubscriptionButton(hiddenButtonRef.current, planId);
            window.setTimeout(() => {
              clickHiddenSubscriptionButton(hiddenButtonRef.current);
            }, 0);
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
      />
    </div>
  );
}
