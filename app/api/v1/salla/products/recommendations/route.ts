// a route that takes storeId and productID and returns a list of recommended products
// they are actually not recommended products but rather talking to salla and fetching n randome products 
// by a search query, like "فستان" or "بنطلون"
// they get the access token of the merchant (storeId) from the db in the merchnats tabe by merchantId and accessToken

import { db } from "@/lib/db";
import { merchants } from "@/lib/db/entities";
import { AuthService } from "@/services/salla/auth";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = "https://demostore.salla.sa";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Vary": "Origin",
        // "ngrok-skip-browser-warning": "69420",
        // "User-Agent": "MyApp/1.0"
    };
}

// // Handle browser CORS preflight requests
// export async function OPTIONS() {
//     return new NextResponse(null, {
//         status: 204,
//         headers: corsHeaders(),
//     });
// }

export async function GET(request: NextRequest) {
    try {
        const storeId =
            request.nextUrl.searchParams.get("storeId") ||
            request.nextUrl.searchParams.get("store_id");

        const productId =
            request.nextUrl.searchParams.get("productId") ||
            request.nextUrl.searchParams.get("product_id");

        if (!storeId) {
            return NextResponse.json(
                {
                    error: "Missing storeId parameter",
                },
                {
                    status: 400,
                    headers: corsHeaders(),
                }
            );
        }

        // Get merchant access token from database
        const accessToken = await AuthService.getValidAccessToken(Number(storeId));
        
        if (!accessToken) {
            return NextResponse.json(
                {
                    error: "Merchant not found",
                },
                {
                    status: 404,
                    headers: corsHeaders(),
                }
            );
        }

        // Fetch recommended products from Salla API
        const response = await fetch(
            `https://api.salla.dev/admin/v2/products?status=sale`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                redirect: "follow",
            }
        );

        if (!response.ok) {
            console.error(
                "Salla API error:",
                response.status,
                await response.text()
            );

            return NextResponse.json(
                {
                    error: "Failed to fetch products from Salla",
                },
                {
                    status: 502,
                    headers: corsHeaders(),
                }
            );
        }

        const {data} = await response.json();

        return NextResponse.json(data, {
            status: 200,
            headers: corsHeaders(),
        });
    } catch (error) {
        console.error("API error:", error);

        return NextResponse.json(
            {
                error: "Internal Server Error",
            },
            {
                status: 500,
                headers: corsHeaders(),
            }
        );
    }
}

