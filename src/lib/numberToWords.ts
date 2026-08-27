/**
 * Indian Number to Words Converter
 * Converts numeric amounts into Indian English format:
 * e.g., 1250 -> "Rupees One Thousand Two Hundred and Fifty Only"
 * e.g., 25.50 -> "Rupees Twenty-Five and Fifty Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  if (num > 0) {
    if (num < 20) {
      str += ONES[num] + ' ';
    } else {
      str += TENS[Math.floor(num / 10)] + ' ';
      if (num % 10 > 0) {
        str += ONES[num % 10] + ' ';
      }
    }
  }
  
  return str.trim();
}

/**
 * Converts a positive number to Indian currency words format.
 */
export function numberToIndianRupees(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Rupees Zero Only';
  }

  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let words = '';

  if (rupees > 0) {
    let n = rupees;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remaining = n;

    if (crore > 0) {
      words += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      words += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      words += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (remaining > 0) {
      words += convertLessThanThousand(remaining) + ' ';
    }
  }

  words = words.trim();
  let result = words.length > 0 ? `Rupees ${words}` : 'Rupees Zero';

  if (paise > 0) {
    const paiseWords = convertLessThanThousand(paise);
    result += ` and ${paiseWords} Paise`;
  }

  result += ' Only';
  return result;
}
