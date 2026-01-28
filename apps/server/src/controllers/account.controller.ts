import { auditLogs, db } from "@financialSite/db";
import { accounts } from "@financialSite/db/schema";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class AccountController {
	async index(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;

			const userAccounts = await db
				.select({
					id: accounts.id,
					name: accounts.name,
					type: accounts.type,
					initialBalance: accounts.initialBalance,
					color: accounts.color,
					createdAt: accounts.createdAt,
				})
				.from(accounts)
				.where(eq(accounts.userId, userId));

			return res.json({
				message: "Accounts retrieved successfully",
				data: userAccounts,
			});
		} catch (error) {
			console.error("Error fetching accounts:", error);
			return res.status(500).json({ error: "Error fetching accounts" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { name, type, initial_balance, color } = req.body;
			const userId = (req as any).user?.id || 1;

			if (!name || !name.trim()) {
				return res.status(400).json({ error: "Account name is required" });
			}

			if (
				type &&
				!["WALLET", "CHECKING", "SAVINGS", "INVESTMENT"].includes(type)
			) {
				return res.status(400).json({ error: "Invalid account type" });
			}

			if (initial_balance && isNaN(Number.parseFloat(initial_balance))) {
				return res
					.status(400)
					.json({ error: "Initial balance must be a valid number" });
			}

			if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
				return res
					.status(400)
					.json({ error: "Color must be a valid hex color (#RRGGBB)" });
			}

			const result = await db.insert(accounts).values({
				userId,
				name: name.trim(),
				type: type || "CHECKING",
				initialBalance: initial_balance || "0.00",
				color: color || null,
			});

			const newAccountId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"ACCOUNT",
				newAccountId,
				{
					name,
					type,
					initial_balance,
					color,
					userId,
				},
				req,
			);

			return res.status(201).json({
				message: "Account created successfully",
				data: { id: newAccountId, name, type, initial_balance, color, userId },
			});
		} catch (error) {
			console.error("Error creating account:", error);
			return res.status(500).json({ error: "Error creating account" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const accountId = id ? Number.parseInt(id as string) : 0;
			const { name, type, color } = req.body;
			const userId = (req as any).user?.id || 1;

			if (isNaN(accountId) || accountId <= 0) {
				return res.status(400).json({ error: "Invalid account ID" });
			}

			const existingAccount = await db
				.select()
				.from(accounts)
				.where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
				.limit(1);

			if (existingAccount.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}

			const updateData: any = {};

			if (name !== undefined) {
				if (!name || !name.trim()) {
					return res.status(400).json({ error: "Account name is required" });
				}
				updateData.name = name.trim();
			}

			if (type !== undefined) {
				if (!["WALLET", "CHECKING", "SAVINGS", "INVESTMENT"].includes(type)) {
					return res.status(400).json({ error: "Invalid account type" });
				}
				updateData.type = type;
			}

			if (color !== undefined) {
				if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
					return res
						.status(400)
						.json({ error: "Color must be a valid hex color (#RRGGBB)" });
				}
				updateData.color = color;
			}

			await db
				.update(accounts)
				.set(updateData)
				.where(eq(accounts.id, accountId));

			await this.createAuditLog(
				"UPDATE",
				"ACCOUNT",
				accountId,
				updateData,
				req,
			);

			return res.json({
				message: "Account updated successfully",
				data: { id: accountId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating account:", error);
			return res.status(500).json({ error: "Error updating account" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const accountId = id ? Number.parseInt(id as string) : 0;
			const userId = (req as any).user?.id || 1;

			if (isNaN(accountId) || accountId <= 0) {
				return res.status(400).json({ error: "Invalid account ID" });
			}

			const existingAccount = await db
				.select()
				.from(accounts)
				.where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
				.limit(1);

			if (existingAccount.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}

			await db.delete(accounts).where(eq(accounts.id, accountId));

			await this.createAuditLog("DELETE", "ACCOUNT", accountId, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting account:", error);
			return res.status(500).json({ error: "Error deleting account" });
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
