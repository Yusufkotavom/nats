"use server";

import { Client } from "pg";
import { getTenantById } from "../tenants/actions";

export async function executeTenantQuery(tenantId: string, query: string) {
    if (!query || !query.trim()) {
        return { success: false, error: "Query cannot be empty" };
    }

    try {
        // Fetch the tenant's exact DB connection string
        const tenantRes = await getTenantById(tenantId);
        if (!tenantRes.success || !tenantRes.data) {
            return { success: false, error: "Tenant not found" };
        }

        const dbUrl = tenantRes.data.dbUrl;
        if (!dbUrl) {
            return { success: false, error: "Tenant does not have a configured database." };
        }

        // Establish an isolated pg Client to run raw SQL
        const client = new Client({ connectionString: dbUrl });
        await client.connect();

        try {
            const res = await client.query(query);
            return {
                success: true,
                data: res.rows,
                rowCount: res.rowCount,
                fields: res.fields.map(f => f.name)
            };
        } catch (queryError: any) {
            console.error("SQL Execution Error:", queryError);
            return { success: false, error: queryError.message || "SQL Error" };
        } finally {
            await client.end();
        }

    } catch (error: any) {
        console.error("Database connection error:", error);
        return { success: false, error: error.message || "Failed to connect to tenant database" };
    }
}
