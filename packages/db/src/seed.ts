import { db } from "@financialSite/db";
import {
	accountMembers,
	accounts,
	categories,
	goals,
	tags,
	users,
} from "@financialSite/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
	console.log("🌱 Starting database seed...");

	try {
		const existingUsers = await db.select().from(users).limit(1);
		if (existingUsers.length > 0) {
			console.log("⚠️  Database already has data. Skipping seed.");
			return;
		}

		const saltRounds = 12;
		const masterPassword = "Master@Admin123";
		const masterPasswordHash = await bcrypt.hash(masterPassword, saltRounds);

		const masterUser = await db.insert(users).values({
			name: "Administrator",
			email: "admin@financialsite.com",
			passwordHash: masterPasswordHash,
		});

		const masterUserId = masterUser[0].insertId;
		console.log("👤 Created master user:", {
			id: masterUserId,
			email: "admin@financialsite.com",
			password: masterPassword,
		});

		const defaultAccounts = [
			{ name: "Carteira", type: "WALLET", color: "#FF6B6B" },
			{ name: "Conta Corrente", type: "CHECKING", color: "#4ECDC4" },
			{ name: "Poupança", type: "SAVINGS", color: "#45B7D1" },
			{ name: "Investimentos", type: "INVESTMENT", color: "#96CEB4" },
		];

		for (const account of defaultAccounts) {
			const result = await db.insert(accounts).values({
				userId: masterUserId,
				name: account.name,
				type: account.type as any,
				color: account.color,
				initialBalance: "0.00",
			});
			console.log(`💳 Created account: ${account.name} (${account.type})`);
		}

		const defaultCategories = [
			{ name: "Salário", type: "INCOME", icon: "💵" },
			{ name: "Freelancer", type: "INCOME", icon: "💼" },
			{ name: "Investimentos", type: "INCOME", icon: "📈" },
			{ name: "Alimentação", type: "EXPENSE", icon: "🍔" },
			{ name: "Transporte", type: "EXPENSE", icon: "🚗" },
			{ name: "Moradia", type: "EXPENSE", icon: "🏠" },
			{ name: "Saúde", type: "EXPENSE", icon: "🏥" },
			{ name: "Educação", type: "EXPENSE", icon: "📚" },
			{ name: "Lazer", type: "EXPENSE", icon: "🎮" },
			{ name: "Contas", type: "EXPENSE", icon: "📄" },
		];

		for (const category of defaultCategories) {
			await db.insert(categories).values({
				userId: masterUserId,
				name: category.name,
				type: category.type as any,
				icon: category.icon,
			});
			console.log(`📁 Created category: ${category.name} (${category.type})`);
		}

		const defaultTags = [
			{ name: "Urgente", color: "#FF4757" },
			{ name: "Importante", color: "#FFA502" },
			{ name: "Recorrente", color: "#5F27CD" },
			{ name: "Opcional", color: "#00D2D3" },
			{ name: "Trabalho", color: "#10AC84" },
			{ name: "Pessoal", color: "#EE5A24" },
		];

		for (const tag of defaultTags) {
			await db.insert(tags).values({
				userId: masterUserId,
				name: tag.name,
				color: tag.color,
			});
			console.log(`🏷️  Created tag: ${tag.name}`);
		}

		const sampleGoals = [
			{
				name: "Fundo de Emergência",
				targetAmount: 10000,
				deadline: new Date("2024-12-31"),
			},
			{
				name: "Viagem Internacional",
				targetAmount: 5000,
				deadline: new Date("2024-06-30"),
			},
			{
				name: "Novo Notebook",
				targetAmount: 3000,
				deadline: new Date("2024-03-31"),
			},
		];

		for (const goal of sampleGoals) {
			await db.insert(goals).values({
				userId: masterUserId,
				name: goal.name,
				targetAmount: goal.targetAmount.toFixed(2),
				currentAmount: "0.00",
				deadline: goal.deadline,
				status: "IN_PROGRESS",
			});
			console.log(
				`🎯 Created goal: ${goal.name} - R$ ${goal.targetAmount.toFixed(2)}`,
			);
		}

		await db.insert(accountMembers).values({
			accountId: 1,
			userId: masterUserId,
			role: "OWNER",
		});
		console.log("👥 Set master user as owner of first account");

		console.log("✅ Database seed completed successfully!");
		console.log("\n🔐 Master User Credentials:");
		console.log("   Email: admin@financialsite.com");
		console.log("   Password: Master@Admin123");
		console.log("   (Please change this password in production)");
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		throw error;
	}
}

if (import.meta.main) {
	seed()
		.then(() => {
			console.log("Seed completed. Exiting...");
			process.exit(0);
		})
		.catch((error) => {
			console.error("Seed failed:", error);
			process.exit(1);
		});
}

export { seed };
