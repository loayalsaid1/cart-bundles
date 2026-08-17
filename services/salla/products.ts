import { ApplyPricingPayload, Product } from "@/types/product";

export class SallaProductService {
    /**
     * Fetch products for a merchant, with optional keyword search.
     */
    static async getProducts(accessToken: string, keyword?: string): Promise<Product[]> {
        const queryParam = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
        const url = `https://api.salla.dev/admin/v2/products${queryParam}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            redirect: "follow",
        });

        if (!response.ok) {
            throw new Error(`Salla API error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        return json.data || [];
    }

    /**
     * Bulk-apply or remove a sale price via Salla's /admin/v2/products/actions endpoint.
     *
     * set_sale  — writes the calculated sale_price onto each product
     * remove_sale — zeroes out sale_price (restores standard price)
     */
    static async applyBulkPricing(
        accessToken: string,
        payload: ApplyPricingPayload
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        const { productIds, action, discountType, amount } = payload;

        try {
            // 1. Dynamically build the value object based on whether we are removing or adding a sale
            const sallaValue = action === "remove_sale"
                ? {
                    column: "sale_price",
                    formula: "amount",     // Salla treats 0 as "no sale"
                    amount: 0,
                    apply_on: "product",
                }
                : {
                    column: "sale_price",
                    formula: discountType === "percentage"
                        ? "price - (price * amount /100 )"
                        : "price - amount",
                    amount: amount ?? 0,
                    apply_on: "product",
                };

            // 2. Construct the unified bulk actions payload
            const sallaPayload = {
                filters: {
                    ids: productIds,
                },
                operations: [
                    {
                        action_name: "pricing",
                        value: sallaValue,
                    },
                ],
            };

            console.log(
                `[SallaProductService] applyBulkPricing (${action}) →`,
                JSON.stringify(sallaPayload, null, 2)
            );

            // 3. Make ONE single fetch call for both scenarios
            const response = await fetch(
                "https://api.salla.dev/admin/v2/products/actions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(sallaPayload),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(
                    `[SallaProductService] applyBulkPricing (${action}) failed:`,
                    JSON.stringify(data, null, 2)
                );
                return {
                    success: false,
                    error: data.error?.message || "Salla API Error",
                };
            }

            return { success: true, data: data.data };

        } catch (err: any) {
            console.error("[SallaProductService] applyBulkPricing threw:", err);
            return { success: false, error: err.message || "Failed to apply pricing" };
        }
    }
}
