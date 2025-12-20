import { z } from "zod";

export const transactionSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    type: z.enum(["EXPENSE", "DEPOSIT"]),
    merchant: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    category_id: z.string().optional(), // Optional for deposits or uncategorized
    member_id: z.string().min(1, "Member is required"), // Who paid?
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date format"),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
