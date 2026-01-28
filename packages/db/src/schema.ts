import {
	type AnyMySqlColumn,
	date,
	decimal,
	int,
	json,
	mysqlEnum,
	mysqlTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const accounts = mysqlTable("accounts", {
	id: serial("id").primaryKey(),
	userId: int("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 100 }).notNull(),
	type: mysqlEnum("type", [
		"WALLET",
		"CHECKING",
		"SAVINGS",
		"INVESTMENT",
	]).default("CHECKING"),
	initialBalance: decimal("initial_balance", {
		precision: 15,
		scale: 2,
	}).default("0.00"),
	color: varchar("color", { length: 7 }),
	createdAt: timestamp("created_at").defaultNow(),
});

export const categories = mysqlTable("categories", {
	id: serial("id").primaryKey(),
	userId: int("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	parentId: int("parent_id").references((): AnyMySqlColumn => categories.id, {
		onDelete: "set null",
	}),
	name: varchar("name", { length: 50 }).notNull(),
	type: mysqlEnum("type", ["INCOME", "EXPENSE"]).notNull(),
	icon: varchar("icon", { length: 50 }),
});

export const transactions = mysqlTable("transactions", {
	id: serial("id").primaryKey(),
	userId: int("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: int("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	categoryId: int("category_id").references(() => categories.id, {
		onDelete: "set null",
	}),
	description: varchar("description", { length: 255 }).notNull(),
	amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
	type: mysqlEnum("type", ["INCOME", "EXPENSE", "TRANSFER"]).notNull(),
	status: mysqlEnum("status", ["PENDING", "PAID"]).default("PAID"),
	dueDate: date("due_date").notNull(),
	paidDate: date("paid_date"),
	observation: text("observation"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const goals = mysqlTable("goals", {
	id: serial("id").primaryKey(),
	userId: int("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 100 }).notNull(),
	targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
	currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).default(
		"0.00",
	),
	deadline: date("deadline").notNull(),
	status: mysqlEnum("status", ["IN_PROGRESS", "COMPLETED", "FAILED"]).default(
		"IN_PROGRESS",
	),
	createdAt: timestamp("created_at").defaultNow(),
});

export const tags = mysqlTable("tags", {
	id: serial("id").primaryKey(),
	userId: int("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 50 }).notNull(),
	color: varchar("color", { length: 7 }),
});

export const transactionTags = mysqlTable(
	"transaction_tags",
	{
		transactionId: int("transaction_id")
			.notNull()
			.references(() => transactions.id, { onDelete: "cascade" }),
		tagId: int("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => ({
		pk: [table.transactionId, table.tagId],
	}),
);

export const accountMembers = mysqlTable(
	"account_members",
	{
		id: serial("id").primaryKey(),
		accountId: int("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		userId: int("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: mysqlEnum("role", ["OWNER", "EDITOR", "VIEWER"]).default("EDITOR"),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		uniqueAccountUser: [table.accountId, table.userId],
	}),
);

export const auditLogs = mysqlTable("audit_logs", {
	id: serial("id").primaryKey(),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	action: mysqlEnum("action", [
		"CREATE",
		"UPDATE",
		"DELETE",
		"LOGIN",
	]).notNull(),
	entity: varchar("entity", { length: 50 }).notNull(),
	entityId: int("entity_id").notNull(),
	changes: json("changes"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow(),
});
