import { AuthService } from "@/services/salla/auth";
import { SallaEmbedAuth } from "@/services/salla/embed-auth";
import { SallaProductService } from "@/services/salla/products";
import { ApplyPricingPayload } from "@/types/product";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const embedAccessToken =
            request.cookies.get("embedToken")?.value ||
            request.headers.get("Authorization")?.split(" ")[1];

        if (!embedAccessToken) {
            return NextResponse.json({ error: "Embedded access token is missing" }, { status: 401 });
        }

        const embedAccessTokenVerified = SallaEmbedAuth.verifyToken(embedAccessToken);
        if (!embedAccessTokenVerified.success) {
            return NextResponse.json({ error: embedAccessTokenVerified.error }, { status: 401 });
        }

        const { merchant_id } = embedAccessTokenVerified.data;
        const accessToken = await AuthService.getValidAccessToken(merchant_id);

        if (!accessToken) {
            return NextResponse.json(
                { error: "Merchant access token is missing or expired" },
                { status: 401 }
            );
        }

        const body: ApplyPricingPayload = await request.json();

        // --- Validate common fields ---
        if (!body.productIds || !Array.isArray(body.productIds) || body.productIds.length === 0) {
            return NextResponse.json(
                { error: "productIds must be a non-empty array" },
                { status: 400 }
            );
        }

        if (!body.action || !["set_sale", "remove_sale"].includes(body.action)) {
            return NextResponse.json(
                { error: "action must be 'set_sale' or 'remove_sale'" },
                { status: 400 }
            );
        }

        // --- Extra validation for set_sale ---
        if (body.action === "set_sale") {
            if (!body.discountType || !["percentage", "fixed"].includes(body.discountType)) {
                return NextResponse.json(
                    { error: "discountType must be 'percentage' or 'fixed'" },
                    { status: 400 }
                );
            }
            if (body.amount === undefined || body.amount <= 0) {
                return NextResponse.json(
                    { error: "A valid positive discount amount is required" },
                    { status: 400 }
                );
            }
            if (body.discountType === "percentage" && body.amount > 100) {
                return NextResponse.json(
                    { error: "Percentage discount cannot exceed 100%" },
                    { status: 400 }
                );
            }
        }

        const result = await SallaProductService.applyBulkPricing(accessToken, body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || "Failed to apply pricing" },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error: any) {
        console.error("Error in pricing route:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
