import { auditLogs, db } from "@financialSite/db";
import { accounts, categories, transactions } from "@financialSite/db/schema";
import { and, between, desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class TransactionController {
	async index(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;

			if (!userId) {
				return res.status(401).json({ error: "User not authenticated" });
			}
			const { account_id, category_id, start_date, end_date, type, status } =
				req.query;

			const filters = [eq(transactions.userId, userId)];

			if (account_id) {
				filters.push(eq(transactions.accountId, Number(account_id)));
			}

			if (category_id) {
				filters.push(eq(transactions.categoryId, Number(category_id)));
			}

			if (type) {
				filters.push(eq(transactions.type, type as any));
			}

			if (status) {
				filters.push(eq(transactions.status, status as any));
			}

			if (start_date && end_date) {
				filters.push(
					between(
						transactions.dueDate,
						new Date(start_date as string),
						new Date(end_date as string),
					),
				);
			}

			const transactionList = await db
				.select({
					id: transactions.id,
					description: transactions.description,
					amount: transactions.amount,
					type: transactions.type,
					status: transactions.status,
					dueDate: transactions.dueDate,
					paidDate: transactions.paidDate,
					observation: transactions.observation,
					createdAt: transactions.createdAt,
					updatedAt: transactions.updatedAt,
					accountId: transactions.accountId,
					categoryId: transactions.categoryId,
					accountName: accounts.name,
					accountType: accounts.type,
					categoryName: categories.name,
					categoryType: categories.type,
					categoryIcon: categories.icon,
				})
				.from(transactions)
				.leftJoin(accounts, eq(transactions.accountId, accounts.id))
				.leftJoin(categories, eq(transactions.categoryId, categories.id))
				.where(and(...filters))
				.orderBy(desc(transactions.dueDate));

			return res.json({
				message: "Transactions retrieved successfully",
				data: transactionList,
			});
		} catch (error) {
			console.error("Error fetching transactions:", error);
			return res.status(500).json({ error: "Error fetching transactions" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const {
				description,
				amount,
				type,
				account_id,
				category_id,
				due_date,
				paid_date,
				status,
				observation,
			} = req.body;
			const userId = (req as any).user?.id || 1;

			if (!description || !description.trim()) {
				return res
					.status(400)
					.json({ error: "Transaction description is required" });
			}

			if (
				!amount ||
				isNaN(Number.parseFloat(amount)) ||
				Number.parseFloat(amount) <= 0
			) {
				return res
					.status(400)
					.json({ error: "Amount must be a positive number" });
			}

			if (!type || !["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
				return res.status(400).json({
					error: "Transaction type must be INCOME, EXPENSE, or TRANSFER",
				});
			}

			if (!account_id) {
				return res.status(400).json({ error: "Account ID is required" });
			}

			if (!due_date) {
				return res.status(400).json({ error: "Due date is required" });
			}

			const accountExists = await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.id, Number.parseInt(account_id)),
						eq(accounts.userId, userId),
					),
				)
				.limit(1);

			if (accountExists.length === 0) {
				return res.status(400).json({ error: "Account not found" });
			}

			if (category_id) {
				const categoryExists = await db
					.select()
					.from(categories)
					.where(
						and(
							eq(categories.id, Number.parseInt(category_id)),
							eq(categories.userId, userId),
						),
					)
					.limit(1);

				if (categoryExists.length === 0) {
					return res.status(400).json({ error: "Category not found" });
				}
			}

			const result = await db.insert(transactions).values({
				userId,
				description: description.trim(),
				amount: Number.parseFloat(amount).toFixed(2),
				type,
				accountId: Number.parseInt(account_id),
				categoryId: category_id ? Number.parseInt(category_id) : null,
				dueDate: new Date(due_date),
				paidDate: paid_date ? new Date(paid_date) : null,
				status: status || "PAID",
				observation: observation || null,
			});

			const newTransactionId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"TRANSACTION",
				newTransactionId,
				{
					description,
					amount,
					type,
					account_id,
					category_id,
					due_date,
					paid_date,
					status,
					observation,
					userId,
				},
				req,
			);

			return res.status(201).json({
				message: "Transaction created successfully",
				data: {
					id: newTransactionId,
					description,
					amount,
					type,
					account_id,
					category_id,
					due_date,
					paid_date,
					status,
					observation,
					userId,
				},
			});
		} catch (error) {
			console.error("Error creating transaction:", error);
			return res.status(500).json({ error: "Error creating transaction" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const transactionId = id ? Number.parseInt(`${id}`) : 0;
			const {
				description,
				amount,
				type,
				account_id,
				category_id,
				due_date,
				paid_date,
				status,
				observation,
			} = req.body;
			const userId = (req as any).user?.id || 1;

			if (isNaN(transactionId) || transactionId <= 0) {
				return res.status(400).json({ error: "Invalid transaction ID" });
			}

			const existingTransaction = await db
				.select()
				.from(transactions)
				.where(
					and(
						eq(transactions.id, transactionId),
						eq(transactions.userId, userId),
					),
				)
				.limit(1);

			if (existingTransaction.length === 0) {
				return res.status(404).json({ error: "Transaction not found" });
			}

			const updateData: any = {};

			if (description !== undefined) {
				if (!description || !description.trim()) {
					return res
						.status(400)
						.json({ error: "Transaction description is required" });
				}
				updateData.description = description.trim();
			}

			if (amount !== undefined) {
				if (
					!amount ||
					isNaN(Number.parseFloat(amount)) ||
					Number.parseFloat(amount) <= 0
				) {
					return res
						.status(400)
						.json({ error: "Amount must be a positive number" });
				}
				updateData.amount = Number.parseFloat(amount).toFixed(2);
			}

			if (type !== undefined) {
				if (!["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
					return res.status(400).json({
						error: "Transaction type must be INCOME, EXPENSE, or TRANSFER",
					});
				}
				updateData.type = type;
			}

			if (account_id !== undefined) {
				if (!account_id) {
					return res.status(400).json({ error: "Account ID is required" });
				}

				const accountExists = await db
					.select()
					.from(accounts)
					.where(
						and(
							eq(accounts.id, Number.parseInt(account_id)),
							eq(accounts.userId, userId),
						),
					)
					.limit(1);

				if (accountExists.length === 0) {
					return res.status(400).json({ error: "Account not found" });
				}
				updateData.accountId = Number.parseInt(account_id);
			}

			if (category_id !== undefined) {
				if (category_id) {
					const categoryExists = await db
						.select()
						.from(categories)
						.where(
							and(
								eq(categories.id, Number.parseInt(category_id)),
								eq(categories.userId, userId),
							),
						)
						.limit(1);

					if (categoryExists.length === 0) {
						return res.status(400).json({ error: "Category not found" });
					}
				}
				updateData.categoryId = category_id
					? Number.parseInt(category_id)
					: null;
			}

			if (due_date !== undefined) {
				updateData.dueDate = new Date(due_date);
			}

			if (paid_date !== undefined) {
				updateData.paidDate = paid_date ? new Date(paid_date) : null;
			}

			if (status !== undefined) {
				if (!["PENDING", "PAID"].includes(status)) {
					return res
						.status(400)
						.json({ error: "Status must be PENDING or PAID" });
				}
				updateData.status = status;
			}

			if (observation !== undefined) {
				updateData.observation = observation || null;
			}

			await db
				.update(transactions)
				.set(updateData)
				.where(eq(transactions.id, transactionId));

			await this.createAuditLog(
				"UPDATE",
				"TRANSACTION",
				transactionId,
				updateData,
				req,
			);

			return res.json({
				message: "Transaction updated successfully",
				data: { id: transactionId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating transaction:", error);
			return res.status(500).json({ error: "Error updating transaction" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const transactionId = id ? Number.parseInt(`${id}`) : 0;
			const userId = (req as any).user?.id || 1;

			if (isNaN(transactionId) || transactionId <= 0) {
				return res.status(400).json({ error: "Invalid transaction ID" });
			}

			const existingTransaction = await db
				.select()
				.from(transactions)
				.where(
					and(
						eq(transactions.id, transactionId),
						eq(transactions.userId, userId),
					),
				)
				.limit(1);

			if (existingTransaction.length === 0) {
				return res.status(404).json({ error: "Transaction not found" });
			}

			await db.delete(transactions).where(eq(transactions.id, transactionId));

			await this.createAuditLog(
				"DELETE",
				"TRANSACTION",
				transactionId,
				null,
				req,
			);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting transaction:", error);
			return res.status(500).json({ error: "Error deleting transaction" });
		}
	}

	private async createAuditLog(
		action: string,
		entity: string,
		entityId: number,
		changes: any,
		req: Request,
	) {
		try {
			const userId = (req as any).user?.id || null;
			const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
			const userAgent = req.headers["user-agent"] || null;

			await db.insert(auditLogs).values({
				userId,
				action: action as any,
				entity,
				entityId,
				changes: changes ? JSON.stringify(changes) : null,
				ipAddress: ipAddress as any,
				userAgent: userAgent as any,
			});
		} catch (error) {
			console.error("Error creating audit log:", error);
		}
	}
}
