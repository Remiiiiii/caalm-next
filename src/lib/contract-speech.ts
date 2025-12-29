import { format } from 'date-fns';
import type { UIFileDoc } from '@/types/files';

interface FormatContractForSpeechOptions {
  contract: UIFileDoc;
  contractIndex?: number;
  totalContracts?: number;
  userName?: string;
  userFullName?: string;
  daysUntilExpiry?: number | null;
}

/**
 * Gets time-based greeting (good morning, afternoon, or evening)
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'good morning';
  if (hour < 17) return 'good afternoon';
  return 'good evening';
}

/**
 * Extracts first name from full name
 */
function getFirstName(fullName?: string): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Formats date in a conversational way (e.g., "January 23rd, 2026")
 */
function formatDateConversational(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const daySuffix =
      day === 1 || day === 21 || day === 31
        ? 'st'
        : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
        ? 'rd'
        : 'th';
    return format(date, `MMMM d'${daySuffix},' yyyy`);
  } catch {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  }
}

/**
 * Formats contract data into natural, conversational speech text for TTS
 */
export function formatContractForSpeech({
  contract,
  contractIndex = 0,
  totalContracts = 1,
  userName,
  userFullName,
  daysUntilExpiry,
}: FormatContractForSpeechOptions): string {
  const parts: string[] = [];

  // Greeting with user's first name
  const firstName = getFirstName(userFullName || userName);
  const greeting = getTimeBasedGreeting();
  if (firstName) {
    parts.push(`Hey ${firstName}, ${greeting}!`);
  } else {
    parts.push(`${greeting.charAt(0).toUpperCase() + greeting.slice(1)}!`);
  }

  // Contract name (declare once at the top)
  const contractName =
    contract.contractName || contract.name || 'Untitled Contract';

  // Contract count notification based on days until expiry
  const days = daysUntilExpiry ?? null;

  if (days !== null && days <= 1) {
    // 24 hours or less
    if (totalContracts === 1) {
      parts.push(
        `Urgent: ${contractName} expires in 24 hours. Immediate action required.`
      );
    } else {
      parts.push(
        `Urgent: You have ${totalContracts} contracts expiring in 24 hours. Immediate action required.`
      );
    }
  } else if (days !== null && days >= 2 && days <= 9) {
    // 9-2 days: No speech (handled by shouldPlaySpeech flag)
    // This case should not be reached if shouldPlaySpeech is false, but include fallback
    if (totalContracts === 1) {
      parts.push(`Reminder: ${contractName} expires in ${days} days.`);
    } else {
      parts.push(
        `Reminder: You have ${totalContracts} contracts expiring in ${days} days.`
      );
    }
  } else if (days !== null && days === 10) {
    // 10 days
    if (totalContracts === 1) {
      parts.push(
        `Important reminder: ${contractName} expires in 10 days. Please take action soon.`
      );
    } else {
      parts.push(
        `Important reminder: You have ${totalContracts} contracts expiring in 10 days. Please take action soon.`
      );
    }
  } else if (days !== null && days === 15) {
    // 15 days
    if (totalContracts === 1) {
      parts.push(
        "Just a heads-up—you've got a contract coming up for renewal in the next 15 days."
      );
    } else {
      parts.push(
        "Just a heads-up—you've got a few contracts coming up for renewal in the next 15 days."
      );
    }
  } else {
    // 30 days (default)
    if (totalContracts === 1) {
      parts.push(
        "Just a heads-up—you've got a contract coming up for renewal in the next 30 days."
      );
    } else if (totalContracts >= 2 && totalContracts <= 3) {
      parts.push(
        "Just a heads-up—you've got a few contracts coming up for renewal in the next 30 days."
      );
    } else {
      parts.push(
        `Looks like you have ${totalContracts} contracts expiring soon, within the next month.`
      );
    }
  }

  // If multiple contracts, introduce which one we're talking about
  if (totalContracts > 1) {
    parts.push(
      `Let's start with contract ${contractIndex + 1} of ${totalContracts}.`
    );
  }

  // Contract expiry date
  let expiryDateText = '';
  if (contract.contractExpiryDate) {
    try {
      expiryDateText = formatDateConversational(contract.contractExpiryDate);
    } catch {
      try {
        const date = new Date(contract.contractExpiryDate);
        expiryDateText = format(date, 'MMMM d, yyyy');
      } catch {
        expiryDateText = contract.contractExpiryDate;
      }
    }
  }

  if (expiryDateText) {
    parts.push(
      `Let's start with your ${contractName}, which expires on ${expiryDateText}.`
    );
  } else {
    parts.push(`Let's start with your ${contractName}.`);
  }

  // Status and amount in natural flow
  const statusText = contract.status
    ? contract.status.charAt(0).toUpperCase() +
      contract.status.slice(1).replace(/-/g, ' ')
    : null;

  const formattedAmount =
    contract.amount !== undefined && contract.amount !== null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(contract.amount)
      : null;

  // Contract type and vendor
  const contractType = contract.contractType || 'service agreement';
  const vendor = contract.vendor;

  // Combine status, amount, type, and vendor in one natural sentence
  if (statusText && formattedAmount && vendor) {
    parts.push(
      `The status of this contract is ${statusText.toLowerCase()} in the amount of ${formattedAmount}. The contract type is a ${contractType.toLowerCase()} and the vendor is ${vendor}.`
    );
  } else if (statusText && formattedAmount) {
    parts.push(
      `The status of this contract is ${statusText.toLowerCase()} in the amount of ${formattedAmount}. The contract type is a ${contractType.toLowerCase()}.`
    );
  } else if (statusText && vendor) {
    parts.push(
      `The status of this contract is ${statusText.toLowerCase()}. The contract type is a ${contractType.toLowerCase()} and the vendor is ${vendor}.`
    );
  } else if (formattedAmount && vendor) {
    parts.push(
      `This contract is in the amount of ${formattedAmount}. The contract type is a ${contractType.toLowerCase()} and the vendor is ${vendor}.`
    );
  } else if (statusText) {
    parts.push(`The status of this contract is ${statusText.toLowerCase()}.`);
  } else if (formattedAmount) {
    parts.push(`The contract value is ${formattedAmount}.`);
  } else if (vendor) {
    parts.push(`The vendor is ${vendor}.`);
  }

  // Vendor contact information
  const counterparty = contract as UIFileDoc & {
    counterpartyLegalName?: string;
    counterpartyContactTitle?: string;
    counterpartyContactEmail?: string;
    counterpartyContactPhone?: string;
    counterpartyAddress?: string;
  };

  const hasContactInfo =
    counterparty.counterpartyLegalName ||
    counterparty.counterpartyContactEmail ||
    counterparty.counterpartyContactPhone ||
    counterparty.counterpartyAddress;

  if (hasContactInfo) {
    parts.push("Here's the vendor's contact information:");

    if (counterparty.counterpartyContactTitle) {
      parts.push(
        `If you need to reach them, their ${counterparty.counterpartyContactTitle} can be contacted`
      );
    } else if (counterparty.counterpartyLegalName) {
      parts.push(
        `If you need to reach them, ${counterparty.counterpartyLegalName} can be contacted`
      );
    } else {
      parts.push('If you need to reach them, they can be contacted');
    }

    const contactMethods: string[] = [];
    if (counterparty.counterpartyContactEmail) {
      contactMethods.push(
        `by email at ${counterparty.counterpartyContactEmail}`
      );
    }
    if (counterparty.counterpartyContactPhone) {
      contactMethods.push(
        `by phone at ${counterparty.counterpartyContactPhone}`
      );
    }
    if (contactMethods.length > 0) {
      if (contactMethods.length === 2) {
        parts.push(`${contactMethods[0]} or ${contactMethods[1]}.`);
      } else {
        parts.push(`${contactMethods[0]}.`);
      }
    }

    if (counterparty.counterpartyAddress) {
      parts.push(`They're located at ${counterparty.counterpartyAddress}.`);
    }
  }

  // Action options
  parts.push(
    'So, what would you like to do? You can renew it now, let it expire, take a closer look at the details, or I can help you get in touch with the provider directly.'
  );

  return parts.join(' ');
}
