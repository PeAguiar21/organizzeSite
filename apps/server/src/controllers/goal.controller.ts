import { auditLogs, db } from "@financialSite/db";
import { goals } from "@financialSite/db/schema";
import { and, between, desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";

export class GoalController {
	async index(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;
			const { status } = req.query;

			const filters = [eq(goals.userId, userId)];

			if (status) {
				filters.push(eq(goals.status, status as any));
			}

			const query = db
				.select({
					id: goals.id,
					name: goals.name,
					targetAmount: goals.targetAmount,
					currentAmount: goals.currentAmount,
					deadline: goals.deadline,
					status: goals.status,
					createdAt: goals.createdAt,
				})
				.from(goals)
				.where(and(...filters));

			const goalList = await query.orderBy(desc(goals.createdAt));

			return res.json({
				message: "Goals retrieved successfully",
				data: goalList,
			});
		} catch (error) {
			console.error("Error fetching goals:", error);
			return res.status(500).json({ error: "Error fetching goals" });
		}
	}

	async create(req: Request, res: Response) {
		try {
			const { name, target_amount, deadline, current_amount } = req.body;
			const userId = (req as any).user?.id || 1;

			if (!name || !name.trim()) {
				return res.status(400).json({ error: "Goal name is required" });
			}

			if (
				!target_amount ||
				isNaN(Number.parseFloat(target_amount)) ||
				Number.parseFloat(target_amount) <= 0
			) {
				return res
					.status(400)
					.json({ error: "Target amount must be a positive number" });
			}

			if (!deadline) {
				return res.status(400).json({ error: "Deadline is required" });
			}

			const deadlineDate = new Date(deadline);
			if (deadlineDate <= new Date()) {
				return res
					.status(400)
					.json({ error: "Deadline must be in the future" });
			}

			const result = await db.insert(goals).values({
				userId,
				name: name.trim(),
				targetAmount: Number.parseFloat(target_amount).toFixed(2),
				currentAmount: current_amount
					? Number.parseFloat(current_amount).toFixed(2)
					: "0.00",
				deadline: deadlineDate,
				status: "IN_PROGRESS",
			});

			const newGoalId = result[0].insertId;

			await this.createAuditLog(
				"CREATE",
				"GOAL",
				newGoalId,
				{
					name,
					target_amount,
					deadline,
					current_amount,
					userId,
				},
				req,
			);

			return res.status(201).json({
				message: "Goal created successfully",
				data: {
					id: newGoalId,
					name,
					target_amount,
					deadline,
					current_amount,
					userId,
				},
			});
		} catch (error) {
			console.error("Error creating goal:", error);
			return res.status(500).json({ error: "Error creating goal" });
		}
	}

	async update(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const goalId = Number.parseInt(`${id}`);
			const { name, target_amount, current_amount, deadline, status } =
				req.body;
			const userId = (req as any).user?.id || 1;

			const existingGoal = await db
				.select()
				.from(goals)
				.where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
				.limit(1);

			if (existingGoal.length === 0) {
				return res.status(404).json({ error: "Goal not found" });
			}

			const updateData: any = {};

			if (name !== undefined) {
				if (!name || !name.trim()) {
					return res.status(400).json({ error: "Goal name is required" });
				}
				updateData.name = name.trim();
			}

			if (target_amount !== undefined) {
				if (
					!target_amount ||
					isNaN(Number.parseFloat(target_amount)) ||
					Number.parseFloat(target_amount) <= 0
				) {
					return res
						.status(400)
						.json({ error: "Target amount must be a positive number" });
				}
				updateData.targetAmount = Number.parseFloat(target_amount).toFixed(2);
			}

			if (current_amount !== undefined) {
				if (current_amount === null || current_amount === "") {
					updateData.currentAmount = "0.00";
				} else if (
					!isNaN(Number.parseFloat(current_amount)) &&
					Number.parseFloat(current_amount) >= 0
				) {
					updateData.currentAmount =
						Number.parseFloat(current_amount).toFixed(2);
				} else {
					return res
						.status(400)
						.json({ error: "Current amount must be a positive number" });
				}
			}

			if (deadline !== undefined) {
				if (!deadline) {
					return res.status(400).json({ error: "Deadline is required" });
				}

				const deadlineDate = new Date(deadline);
				if (deadlineDate <= new Date()) {
					return res
						.status(400)
						.json({ error: "Deadline must be in the future" });
				}
				updateData.deadline = deadlineDate;
			}

			if (status !== undefined) {
				if (!["IN_PROGRESS", "COMPLETED", "FAILED"].includes(status)) {
					return res.status(400).json({
						error: "Status must be IN_PROGRESS, COMPLETED, or FAILED",
					});
				}
				updateData.status = status;
			}

			if (current_amount !== undefined && target_amount !== undefined) {
				if (
					Number.parseFloat(updateData.currentAmount) >=
					Number.parseFloat(updateData.targetAmount)
				) {
					updateData.status = "COMPLETED";
				}
			}

			await db.update(goals).set(updateData).where(eq(goals.id, goalId));

			await this.createAuditLog("UPDATE", "GOAL", goalId, updateData, req);

			return res.json({
				message: "Goal updated successfully",
				data: { id: goalId, ...updateData },
			});
		} catch (error) {
			console.error("Error updating goal:", error);
			return res.status(500).json({ error: "Error updating goal" });
		}
	}

	async delete(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const goalId = Number.parseInt(`${id}`);
			const userId = (req as any).user?.id || 1;

			const existingGoal = await db
				.select()
				.from(goals)
				.where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
				.limit(1);

			if (existingGoal.length === 0) {
				return res.status(404).json({ error: "Goal not found" });
			}

			await db.delete(goals).where(eq(goals.id, goalId));

			await this.createAuditLog("DELETE", "GOAL", goalId, null, req);

			return res.status(204).send();
		} catch (error) {
			console.error("Error deleting goal:", error);
			return res.status(500).json({ error: "Error deleting goal" });
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
