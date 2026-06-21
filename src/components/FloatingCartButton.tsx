import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadStoredQuote } from '../data/projectQuote';

function getCartCount() {
  const quote = loadStoredQuote();
  return (quote.selectedPackageId ? 1 : 0) + quote.selectedAddonIds.length;
}

export function FloatingCartButton() {
  const [itemCount, setItemCount] = useState(() => getCartCount());

  useEffect(() => {
    const updateCount = () => {
      setItemCount(getCartCount());
    };

    window.addEventListener('storage', updateCount);
    window.addEventListener('samuel-studio-project-quote-changed', updateCount as EventListener);

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('samuel-studio-project-quote-changed', updateCount as EventListener);
    };
  }, []);

  return (
    <button
      type="button"
      className="paypal-floating-cart button button--primary"
      aria-label={`Open cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
      onClick={() => {
        document.getElementById('project-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      <div className="paypal-floating-cart__spark" aria-hidden="true" />
      <ShoppingCart size={18} />
      <span>Cart</span>
      <strong>({itemCount})</strong>
    </button>
  );
}
