export function isValidId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function formatNumberInput(value: string): string {
  if (!value) return '';
  
  let cleaned = value.replace(/,/g, '.');
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  if (cleaned.match(/^0+[1-9]/)) {
    cleaned = cleaned.replace(/^0+/, '');
  }
  
  if (cleaned === '0.' || cleaned === '0') {
    return cleaned;
  }
  
  return cleaned;
}

export function handleNumberInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setValue: (value: string) => void
) {
  const formatted = formatNumberInput(e.target.value);
  setValue(formatted);
  e.target.value = formatted;
}

export function calculateChange(totalPaid: number, total: number): number {
  return Math.max(0, totalPaid - total);
}

export function calculateMultiplePaymentChange(
  paymentDetails: Array<{ method: string; amount: number }>,
  total: number
): { cashChange: number; totalPaid: number; remaining: number } {
  const totalPaid = paymentDetails.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashPayment = paymentDetails.find(p => p.method === 'cash');
  const cashAmount = cashPayment ? Number(cashPayment.amount) : 0;
  const cashChange = Math.max(0, cashAmount - total);
  const remaining = total - totalPaid;
  
  return {
    cashChange,
    totalPaid,
    remaining
  };
}

export function validateUUID(id: string, context: string = ''): void {
  if (!isValidId(id)) {
    throw new Error(`${context ? context + ': ' : ''}ID inválido: ${id}`);
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

