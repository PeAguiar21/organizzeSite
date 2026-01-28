import { auditLogs, db } from "@financialSite/db";
import { users } from "@financialSite/db/schema";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import type { Request, Response } from "express";

export class UserController {
	async index(_req: Request, res: Response) {
		try {
			const userId = (_req as any).user?.id;

			const userList = await db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.from(users)
				.where(eq(users.id, userId));

			return res.json({
				message: "User data retrieved",
				data: userList,
			});
		} catch (error) {
			console.error("Error fetching user:", error);
			return res.status(500).json({ error: "Error fetching user data" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { name, email, password } = req.body;

			if (!name || !email || !password) {
				return res
					.status(400)
					.json({ error: "Name, email and password are required" });
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return res.status(400).json({ error: "Invalid email format" });
			}

			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);
			if (existingUser.length > 0) {
				return res.status(400).json({ error: "Email already registered" });
			}

			const saltRounds = 12;
			const passwordHash = await bcrypt.hash(password, saltRounds);

			const result = await db.insert(users).values({
				name,
				email,
				passwordHash,
			});

			const newUserId = result[0].insertId;

			await this.createAuditLog("CREATE", "USER", newUserId, null, req);

			return res.status(201).json({
				message: "User created successfully",
				data: { id: newUserId, name, email },
			});
		} catch (error) {
			console.error("Error creating user:", error);
			return res.status(500).json({ error: "Error creating user" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const userId = Number.parseInt(`${id}`);
			const { name, email, currentPassword, newPassword } = req.body;

			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			if (existingUser.length === 0) {
				return res.status(404).json({ error: "User not found" });
			}

			const updateData: any = {};

			if (name) updateData.name = name;

			if (email) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(email)) {
					return res.status(400).json({ error: "Invalid email format" });
				}

				const emailExists = await db
					.select()
					.from(users)
					.where(and(eq(users.email, email), ne(users.id, userId)))
					.limit(1);
				if (emailExists.length > 0) {
					return res
						.status(400)
						.json({ error: "Email already registered by another user" });
				}

				updateData.email = email;
			}

			if (newPassword) {
				if (!currentPassword) {
					return res.status(400).json({
						error: "Current password is required to set new password",
					});
				}

				const isCurrentPasswordValid = await bcrypt.compare(
					currentPassword,
					existingUser[0]!.passwordHash,
				);
				if (!isCurrentPasswordValid) {
					return res
						.status(400)
						.json({ error: "Current password is incorrect" });
				}

				const saltRounds = 12;
				updateData.passwordHash = await bcrypt.hash(newPassword, saltRounds);
			}

			await db.update(users).set(updateData).where(eq(users.id, userId));

			await this.createAuditLog("UPDATE", "USER", userId, updateData, req);

			return res.json({
				message: "User updated successfully",
				data: { id: userId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating user:", error);
			return res.status(500).json({ error: "Error updating user" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const userId = Number.parseInt(`${id}`);

			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			if (existingUser.length === 0) {
				return res.status(404).json({ error: "User not found" });
			}

			await db.delete(users).where(eq(users.id, userId));

			await this.createAuditLog("DELETE", "USER", userId, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting user:", error);
			return res.status(500).json({ error: "Error deleting user" });
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
