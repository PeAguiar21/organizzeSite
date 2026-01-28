import { auditLogs, db } from "@financialSite/db";
import { categories } from "@financialSite/db/schema";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class CategoryController {
	async index(_req: Request, res: Response) {
		try {
			const userId = (_req as any).user?.id;

			const userCategories = await db
				.select({
					id: categories.id,
					name: categories.name,
					type: categories.type,
					icon: categories.icon,
					parentId: categories.parentId,
				})
				.from(categories)
				.where(eq(categories.userId, userId));

			return res.json({
				message: "Categories retrieved successfully",
				data: userCategories,
			});
		} catch (error) {
			console.error("Error fetching categories:", error);
			return res.status(500).json({ error: "Error fetching categories" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { name, type, icon, parent_id } = req.body;
			const userId = (req as any).user?.id || 1;

			if (!name || !name.trim()) {
				return res.status(400).json({ error: "Category name is required" });
			}

			if (!type || !["INCOME", "EXPENSE"].includes(type)) {
				return res
					.status(400)
					.json({ error: "Category type must be INCOME or EXPENSE" });
			}

			if (parent_id) {
				const parentExists = await db
					.select()
					.from(categories)
					.where(
						and(
							eq(categories.id, Number.parseInt(parent_id)),
							eq(categories.userId, userId),
						),
					)
					.limit(1);

				if (parentExists.length === 0) {
					return res.status(400).json({ error: "Parent category not found" });
				}

				if (parentExists[0]) {
					if (parentExists[0].type !== type) {
						return res
							.status(400)
							.json({ error: "Parent category must have the same type" });
					}
				}
			}

			const result = await db.insert(categories).values({
				userId,
				name: name.trim(),
				type,
				icon: icon || null,
				parentId: parent_id ? Number.parseInt(parent_id) : null,
			});

			const newCategoryId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"CATEGORY",
				newCategoryId,
				{
					name,
					type,
					icon,
					parent_id,
					userId,
				},
				req,
			);

			return res.status(201).json({
				message: "Category created successfully",
				data: { id: newCategoryId, name, type, icon, parent_id, userId },
			});
		} catch (error) {
			console.error("Error creating category:", error);
			return res.status(500).json({ error: "Error creating category" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const categoryId = id ? Number.parseInt(id as string) : 0;
			const { name, type, icon } = req.body;
			const userId = (req as any).user?.id || 1;

			if (isNaN(categoryId) || categoryId <= 0) {
				return res.status(400).json({ error: "Invalid category ID" });
			}

			const existingCategory = await db
				.select()
				.from(categories)
				.where(
					and(eq(categories.id, categoryId), eq(categories.userId, userId)),
				)
				.limit(1);

			if (existingCategory.length === 0) {
				return res.status(404).json({ error: "Category not found" });
			}

			const updateData: any = {};

			if (name !== undefined) {
				if (!name || !name.trim()) {
					return res.status(400).json({ error: "Category name is required" });
				}
				updateData.name = name.trim();
			}

			if (type !== undefined) {
				if (!["INCOME", "EXPENSE"].includes(type)) {
					return res
						.status(400)
						.json({ error: "Category type must be INCOME or EXPENSE" });
				}

				if (existingCategory[0]) {
					if (type !== existingCategory[0].type) {
						const childCategories = await db
							.select()
							.from(categories)
							.where(eq(categories.parentId, categoryId))
							.limit(1);

						if (childCategories.length > 0) {
							return res.status(400).json({
								error:
									"Cannot change category type when it has child categories",
							});
						}
						updateData.type = type;
					} else {
						updateData.type = type;
					}
				}
			}

			if (icon !== undefined) {
				updateData.icon = icon;
			}

			await db
				.update(categories)
				.set(updateData)
				.where(eq(categories.id, categoryId));

			await this.createAuditLog(
				"UPDATE",
				"CATEGORY",
				categoryId,
				updateData as any,
				req,
			);

			return res.json({
				message: "Category updated successfully",
				data: { id: categoryId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating category:", error);
			return res.status(500).json({ error: "Error updating category" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const categoryId = id ? Number.parseInt(id as string) : 0;
			const userId = (req as any).user?.id || 1;

			if (isNaN(categoryId) || categoryId <= 0) {
				return res.status(400).json({ error: "Invalid category ID" });
			}

			const existingCategory = await db
				.select()
				.from(categories)
				.where(
					and(eq(categories.id, categoryId), eq(categories.userId, userId)),
				)
				.limit(1);

			if (existingCategory.length === 0) {
				return res.status(404).json({ error: "Category not found" });
			}

			const childCategories = await db
				.select()
				.from(categories)
				.where(eq(categories.parentId, categoryId))
				.limit(1);

			if (childCategories.length > 0) {
				return res
					.status(400)
					.json({ error: "Cannot delete category with child categories" });
			}

			await db.delete(categories).where(eq(categories.id, categoryId));

			await this.createAuditLog("DELETE", "CATEGORY", categoryId, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting category:", error);
			return res.status(500).json({ error: "Error deleting category" });
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
