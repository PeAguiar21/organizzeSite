import { auditLogs, db } from "@financialSite/db";
import { tags } from "@financialSite/db/schema";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class TagController {
	async index(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;

			const userTags = await db
				.select({
					id: tags.id,
					name: tags.name,
					color: tags.color,
				})
				.from(tags)
				.where(eq(tags.userId, userId));

			return res.json({
				message: "Tags retrieved successfully",
				data: userTags,
			});
		} catch (error) {
			console.error("Error fetching tags:", error);
			return res.status(500).json({ error: "Error fetching tags" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { name, color } = req.body;
			const userId = (req as any).user?.id || 1;

			if (!name || !name.trim()) {
				return res.status(400).json({ error: "Tag name is required" });
			}

			if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
				return res
					.status(400)
					.json({ error: "Color must be a valid hex color (#RRGGBB)" });
			}

			const existingTag = await db
				.select()
				.from(tags)
				.where(and(eq(tags.userId, userId), eq(tags.name, name.trim())))
				.limit(1);

			if (existingTag.length > 0) {
				return res
					.status(400)
					.json({ error: "Tag with this name already exists" });
			}

			const result = await db.insert(tags).values({
				userId,
				name: name.trim(),
				color: color || null,
			});

			const newTagId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"TAG",
				newTagId,
				{
					name,
					color,
					userId,
				},
				req,
			);

			return res.status(201).json({
				message: "Tag created successfully",
				data: { id: newTagId, name, color, userId },
			});
		} catch (error) {
			console.error("Error creating tag:", error);
			return res.status(500).json({ error: "Error creating tag" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const tagId = Number.parseInt(`${id}`);
			const { name, color } = req.body;
			const userId = (req as any).user?.id || 1;

			const existingTag = await db
				.select()
				.from(tags)
				.where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
				.limit(1);

			if (existingTag.length === 0) {
				return res.status(404).json({ error: "Tag not found" });
			}

			const updateData: any = {};

			if (name !== undefined) {
				if (!name || !name.trim()) {
					return res.status(400).json({ error: "Tag name is required" });
				}

				const tagWithSameName = await db
					.select()
					.from(tags)
					.where(
						and(
							eq(tags.userId, userId),
							eq(tags.name, name.trim()),
							eq(tags.id, tagId),
						),
					)
					.limit(1);

				if (tagWithSameName.length > 0) {
					return res
						.status(400)
						.json({ error: "Tag with this name already exists" });
				}
				updateData.name = name.trim();
			}

			if (color !== undefined) {
				if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
					return res
						.status(400)
						.json({ error: "Color must be a valid hex color (#RRGGBB)" });
				}
				updateData.color = color;
			}

			await db.update(tags).set(updateData).where(eq(tags.id, tagId));

			await this.createAuditLog("UPDATE", "TAG", tagId, updateData, req);

			return res.json({
				message: "Tag updated successfully",
				data: { id: tagId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating tag:", error);
			return res.status(500).json({ error: "Error updating tag" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const tagId = Number.parseInt(`${id}`);
			const userId = (req as any).user?.id || 1;

			const existingTag = await db
				.select()
				.from(tags)
				.where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
				.limit(1);

			if (existingTag.length === 0) {
				return res.status(404).json({ error: "Tag not found" });
			}

			await db.delete(tags).where(eq(tags.id, tagId));

			await this.createAuditLog("DELETE", "TAG", tagId, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting tag:", error);
			return res.status(500).json({ error: "Error deleting tag" });
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
