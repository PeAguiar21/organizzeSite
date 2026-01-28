import { db } from "@financialSite/db";
import { auditLogs, users } from "@financialSite/db/schema";
import { and, between, desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class AuditLogController {
	async index(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;
			const { entity, action, start_date, end_date } = req.query;

			const filters = [eq(auditLogs.userId, userId)];

			if (entity) {
				filters.push(eq(auditLogs.entity, entity as string));
			}

			if (action) {
				filters.push(eq(auditLogs.action, action as any));
			}

			if (start_date && end_date) {
				filters.push(
					between(
						auditLogs.createdAt,
						new Date(start_date as string),
						new Date(end_date as string),
					),
				);
			}

			if (start_date && end_date) {
				filters.push(
					between(
						auditLogs.createdAt,
						new Date(start_date as string),
						new Date(end_date as string),
					),
				);
			}

			const query = db
				.select({
					id: auditLogs.id,
					userId: auditLogs.userId,
					action: auditLogs.action,
					entity: auditLogs.entity,
					entityId: auditLogs.entityId,
					changes: auditLogs.changes,
					ipAddress: auditLogs.ipAddress,
					userAgent: auditLogs.userAgent,
					createdAt: auditLogs.createdAt,
					userName: users.name,
				})
				.from(auditLogs)
				.leftJoin(users, eq(auditLogs.userId, users.id))
				.where(and(...filters));

			const logs = await query.orderBy(desc(auditLogs.createdAt)).limit(100);

			return res.json({
				message: "Audit logs retrieved successfully",
				data: logs,
			});
		} catch (error) {
			console.error("Error fetching audit logs:", error);
			return res.status(500).json({ error: "Error fetching audit logs" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { action, entity, entity_id, changes, ip_address, user_agent } =
				req.body;
			const userId = (req as any).user?.id || 1;

			if (
				!action ||
				!["CREATE", "UPDATE", "DELETE", "LOGIN"].includes(action)
			) {
				return res
					.status(400)
					.json({ error: "Action must be CREATE, UPDATE, DELETE, or LOGIN" });
			}

			if (!entity || !entity.trim()) {
				return res.status(400).json({ error: "Entity is required" });
			}

			if (!entity_id) {
				return res.status(400).json({ error: "Entity ID is required" });
			}

			await db.insert(auditLogs).values({
				userId,
				action: action as any,
				entity: entity.trim(),
				entityId: Number.parseInt(entity_id),
				changes: changes ? JSON.stringify(changes) : null,
				ipAddress: ip_address || (req.ip as any) || null,
				userAgent: user_agent || (req.headers["user-agent"] as any) || null,
			});

			return res.status(201).json({
				message: "Audit log created successfully",
				data: { action, entity, entity_id, userId },
			});
		} catch (error) {
			console.error("Error creating audit log:", error);
			return res.status(500).json({ error: "Error creating audit log" });
		}
	}

	async update(req: Request, res: Response) {
		return res.status(403).json({ error: "Audit logs cannot be updated" });
	}

	async delete(req: Request, res: Response) {
		return res.status(403).json({ error: "Audit logs cannot be deleted" });
	}
}
