export type ParsedScaleBarcode = {
  format: 'EAN13';
  type: 'weight' | 'price';
  itemCode: string;
  amount: number;
  raw: string;
};

function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

export function parseScaleEan13(barcode: string): ParsedScaleBarcode | null {
  const code = (barcode || '').trim();
  if (code.length !== 13 || !isDigits(code)) return null;

  const prefix = code.slice(0, 2);
  const variablePrefixes = ['20','21','22','23','24','25','26','27','28','29'];
  if (!variablePrefixes.includes(prefix)) return null;

  const itemCode = code.slice(2, 7);
  const valueDigits = code.slice(7, 12);

  if (!isDigits(itemCode) || !isDigits(valueDigits)) return null;

  const valueNum = parseInt(valueDigits, 10);
  const isWeight = prefix === '25' || prefix === '26';

  if (isWeight) {
    const kg = valueNum / 1000;
    return { format: 'EAN13', type: 'weight', itemCode, amount: kg, raw: code };
  }

  const total = valueNum / 100;
  return { format: 'EAN13', type: 'price', itemCode, amount: total, raw: code };
}

export function parseScaleBarcode(barcode: string): ParsedScaleBarcode | null {
  return parseScaleEan13(barcode);
}

