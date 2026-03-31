export function formatCurrency(amount: number) {
    return `$${Math.abs(amount).toFixed(2)}`;
  }
  
  export function shortHash(hash?: string) {
    if (!hash) return "";
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }