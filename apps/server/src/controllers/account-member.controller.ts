import { auditLogs, db } from "@financialSite/db";
import { accountMembers, accounts, users } from "@financialSite/db/schema";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class AccountMemberController {
	async index(req: Request, res: Response) {
		try {
			const { account_id } = req.params;
			const userId = (req as any).user?.id;

			const accountIdNum = account_id
				? Number.parseInt(account_id as string)
				: 0;
			if (isNaN(accountIdNum) || accountIdNum <= 0) {
				return res.status(400).json({ error: "Invalid account ID" });
			}

			const accountExists = await db
				.select()
				.from(accounts)
				.where(eq(accounts.id, accountIdNum))
				.limit(1);

			if (accountExists.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}
			if (accountExists[0]) {
				if (accountExists[0].userId !== userId) {
					const isMember = await db
						.select()
						.from(accountMembers)
						.where(
							and(
								eq(accountMembers.accountId, accountIdNum),
								eq(accountMembers.userId, userId),
							),
						)
						.limit(1);

					if (isMember.length === 0) {
						return res
							.status(403)
							.json({ error: "Access denied to this account" });
					}
				}
			}

			const members = await db
				.select({
					id: accountMembers.id,
					userId: accountMembers.userId,
					role: accountMembers.role,
					createdAt: accountMembers.createdAt,
					userName: users.name,
					userEmail: users.email,
				})
				.from(accountMembers)
				.leftJoin(users, eq(accountMembers.userId, users.id))
				.where(eq(accountMembers.accountId, accountIdNum));

			return res.json({
				message: "Account members retrieved successfully",
				data: members,
			});
		} catch (error) {
			console.error("Error fetching account members:", error);
			return res.status(500).json({ error: "Error fetching account members" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { account_id } = req.params;
			const { user_id, role } = req.body;
			const userId = (req as any).user?.id || 1;

			const accountIdNum = account_id
				? Number.parseInt(account_id as string)
				: 0;
			if (isNaN(accountIdNum) || accountIdNum <= 0) {
				return res.status(400).json({ error: "Invalid account ID" });
			}

			if (!user_id) {
				return res.status(400).json({ error: "User ID is required" });
			}

			if (role && !["OWNER", "EDITOR", "VIEWER"].includes(role)) {
				return res
					.status(400)
					.json({ error: "Role must be OWNER, EDITOR, or VIEWER" });
			}

			const accountExists = await db
				.select()
				.from(accounts)
				.where(eq(accounts.id, accountIdNum))
				.limit(1);

			if (accountExists.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}

			if (accountExists[0]) {
				if (accountExists[0].userId !== userId) {
					const currentMember = await db
						.select()
						.from(accountMembers)
						.where(
							and(
								eq(accountMembers.accountId, accountIdNum),
								eq(accountMembers.userId, userId),
								eq(accountMembers.role, "OWNER"),
							),
						)
						.limit(1);

					if (currentMember.length === 0) {
						return res
							.status(403)
							.json({ error: "Only account owners can add members" });
					}
				}
			}

			const userIdNum = user_id ? Number.parseInt(user_id) : 0;
			if (isNaN(userIdNum) || userIdNum <= 0) {
				return res.status(400).json({ error: "Invalid user ID" });
			}

			const targetUser = await db
				.select()
				.from(users)
				.where(eq(users.id, userIdNum))
				.limit(1);

			if (targetUser.length === 0) {
				return res.status(400).json({ error: "Target user not found" });
			}

			const existingMember = await db
				.select()
				.from(accountMembers)
				.where(
					and(
						eq(accountMembers.accountId, accountIdNum),
						eq(accountMembers.userId, userIdNum),
					),
				)
				.limit(1);

			if (existingMember.length > 0) {
				return res
					.status(400)
					.json({ error: "User is already a member of this account" });
			}

			const result = await db.insert(accountMembers).values({
				accountId: accountIdNum,
				userId: userIdNum,
				role: role || "EDITOR",
			});

			const newMemberId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"ACCOUNT_MEMBER",
				newMemberId,
				{
					account_id,
					user_id,
					role,
				},
				req,
			);

			return res.status(201).json({
				message: "Account member added successfully",
				data: { id: newMemberId, account_id, user_id, role: role || "EDITOR" },
			});
		} catch (error) {
			console.error("Error adding account member:", error);
			return res.status(500).json({ error: "Error adding account member" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { account_id, id } = req.params;
			const { role } = req.body;
			const userId = (req as any).user?.id || 1;

			const accountIdNum = account_id
				? Number.parseInt(account_id as string)
				: 0;
			const idNum = id ? Number.parseInt(id as string) : 0;
			if (
				isNaN(accountIdNum) ||
				accountIdNum <= 0 ||
				isNaN(idNum) ||
				idNum <= 0
			) {
				return res
					.status(400)
					.json({ error: "Invalid account ID or member ID" });
			}

			if (!role || !["OWNER", "EDITOR", "VIEWER"].includes(role)) {
				return res
					.status(400)
					.json({ error: "Role must be OWNER, EDITOR, or VIEWER" });
			}

			const member = await db
				.select()
				.from(accountMembers)
				.where(
					and(
						eq(accountMembers.id, idNum),
						eq(accountMembers.accountId, accountIdNum),
					),
				)
				.limit(1);

			if (member.length === 0) {
				return res.status(404).json({ error: "Account member not found" });
			}

			const account = await db
				.select()
				.from(accounts)
				.where(eq(accounts.id, accountIdNum))
				.limit(1);

			if (account.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}
			if (account[0]) {
				if (account[0].userId !== userId) {
					const currentMember = await db
						.select()
						.from(accountMembers)
						.where(
							and(
								eq(accountMembers.accountId, accountIdNum),
								eq(accountMembers.userId, userId),
								eq(accountMembers.role, "OWNER"),
							),
						)
						.limit(1);

					if (currentMember.length === 0) {
						return res
							.status(403)
							.json({ error: "Only account owners can update member roles" });
					}
				}
			}

			await db
				.update(accountMembers)
				.set({ role })
				.where(eq(accountMembers.id, idNum));

			await this.createAuditLog(
				"UPDATE",
				"ACCOUNT_MEMBER",
				idNum,
				{ role },
				req,
			);

			return res.json({
				message: "Account member updated successfully",
				data: { id: idNum, account_id, role },
			});
		} catch (error) {
			console.error("Error updating account member:", error);
			return res.status(500).json({ error: "Error updating account member" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { account_id, id } = req.params;
			const userId = (req as any).user?.id || 1;

			const accountIdNum = account_id
				? Number.parseInt(account_id as string)
				: 0;
			const idNum = id ? Number.parseInt(id as string) : 0;
			if (
				isNaN(accountIdNum) ||
				accountIdNum <= 0 ||
				isNaN(idNum) ||
				idNum <= 0
			) {
				return res
					.status(400)
					.json({ error: "Invalid account ID or member ID" });
			}

			const member = await db
				.select()
				.from(accountMembers)
				.where(
					and(
						eq(accountMembers.id, idNum),
						eq(accountMembers.accountId, accountIdNum),
					),
				)
				.limit(1);

			if (member.length === 0) {
				return res.status(404).json({ error: "Account member not found" });
			}

			const account = await db
				.select()
				.from(accounts)
				.where(eq(accounts.id, accountIdNum))
				.limit(1);

			if (account.length === 0) {
				return res.status(404).json({ error: "Account not found" });
			}
			if (member[0] && account[0]) {
				if (account[0].userId !== userId && member[0].userId !== userId) {
					const currentMember = await db
						.select()
						.from(accountMembers)
						.where(
							and(
								eq(accountMembers.accountId, accountIdNum),
								eq(accountMembers.userId, userId),
								eq(accountMembers.role, "OWNER"),
							),
						)
						.limit(1);

					if (currentMember.length === 0) {
						return res
							.status(403)
							.json({ error: "Only account owners can remove members" });
					}
				}
			}

			await db.delete(accountMembers).where(eq(accountMembers.id, idNum));

			await this.createAuditLog("DELETE", "ACCOUNT_MEMBER", idNum, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error removing account member:", error);
			return res.status(500).json({ error: "Error removing account member" });
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
