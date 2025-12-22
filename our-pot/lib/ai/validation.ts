import { z } from "zod";

/**
 * Validation error structure
 */
export interface ValidationError {
  error: string;
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * Convert decimal amount to integer cents/pence
 * AI speaks in decimals (42.50), database stores integers (4250)
 *
 * @param amount - Decimal amount (e.g., 42.50)
 * @returns Integer cents/pence (e.g., 4250)
 */
export function validateAndConvertAmount(amount: number): number {
  // Validation: must be positive
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  // Validation: max 2 decimal places
  const decimals = (amount.toString().split(".")[1] || "").length;
  if (decimals > 2) {
    throw new Error("Amount cannot have more than 2 decimal places");
  }

  // Convert to cents/pence (multiply by 100 and round)
  return Math.round(amount * 100);
}

/**
 * Convert integer cents/pence to decimal display format
 * Database stores integers (4250), UI displays decimals (42.50)
 *
 * @param amountInCents - Integer cents/pence (e.g., 4250)
 * @returns Decimal amount (e.g., 42.50)
 */
export function convertCentsToDecimal(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Business rule: date cannot be in the future
 */
export function validateDate(dateString: string): void {
  const date = new Date(dateString);
  const now = new Date();

  if (date > now) {
    throw new Error("Transaction date cannot be in the future");
  }
}

/**
 * Business rule: category required for EXPENSE transactions
 */
export function validateCategoryForExpense(type: string, categoryId?: string): void {
  if (type === "EXPENSE" && !categoryId) {
    throw new Error("Category is required for EXPENSE transactions");
  }
}

/**
 * Transaction validation schema (for AI proposals)
 */
export const TransactionProposalSchema = z.object({
  type: z.enum(["EXPENSE", "DEPOSIT"]).describe("Transaction type: EXPENSE (money out) or DEPOSIT (money in)"),
  amount: z.number().positive().describe("Amount in currency format (e.g., 42.50). Must be positive with max 2 decimals"),
  merchant: z.string().optional().describe("Merchant or vendor name"),
  description: z.string().min(1).describe("Description of the transaction"),
  categoryId: z.string().optional().describe("Category ID (required for EXPENSE, optional for DEPOSIT)"),
  memberId: z.string().optional().describe("ID of member who paid. Defaults to Kitty if not specified"),
  date: z.string().optional().describe("Transaction date (ISO YYYY-MM-DD). Defaults to today"),
});

/**
 * Category validation schema
 */
export const CategoryProposalSchema = z.object({
  name: z.string().min(1).describe("Category name (e.g., 'Groceries', 'Transport')"),
  icon: z.string().optional().describe("Optional emoji or icon identifier"),
  color: z.string().optional().describe("Optional hex color code (e.g., '#4CAF50')"),
});

/**
 * Validate transaction proposal and convert amount
 */
export function validateTransactionProposal(data: unknown): {
  valid: boolean;
  errors?: ValidationError[];
  converted?: {
    type: string;
    amount: number; // in cents
    merchant?: string;
    description: string;
    categoryId?: string;
    memberId?: string;
    date?: string;
  };
} {
  try {
    // Schema validation
    const parsed = TransactionProposalSchema.parse(data);

    // Convert amount to cents
    const amountInCents = validateAndConvertAmount(parsed.amount);

    // Business rule validations
    if (parsed.date) {
      validateDate(parsed.date);
    }
    validateCategoryForExpense(parsed.type, parsed.categoryId);

    return {
      valid: true,
      converted: {
        ...parsed,
        amount: amountInCents,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e) => ({
          error: "SCHEMA_ERROR",
          field: e.path.join("."),
          message: e.message,
        })),
      };
    }

    return {
      valid: false,
      errors: [
        {
          error: "BUSINESS_RULE_VIOLATION",
          message: error instanceof Error ? error.message : "Validation failed",
        },
      ],
    };
  }
}

/**
 * Validate category proposal
 */
export function validateCategoryProposal(data: unknown): {
  valid: boolean;
  errors?: ValidationError[];
  converted?: {
    name: string;
    icon?: string;
    color?: string;
  };
} {
  try {
    const parsed = CategoryProposalSchema.parse(data);

    return {
      valid: true,
      converted: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e) => ({
          error: "SCHEMA_ERROR",
          field: e.path.join("."),
          message: e.message,
        })),
      };
    }

    return {
      valid: false,
      errors: [
        {
          error: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Validation failed",
        },
      ],
    };
  }
}
