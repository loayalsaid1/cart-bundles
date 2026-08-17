// A route to get products of a merchant, and if given a search query they get products with that search query 
// extracting merchant id from teh token in the header given by payload of the salla embedded skd token
// getting the access token of the merchnat from teh  merchants table by merchant id
// call get request to salla api 
// return the products

import { AuthService } from "@/services/salla/auth";
import { SallaEmbedAuth } from "@/services/salla/embed-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Authorization header is missing" }, { status: 400 });
        }
        const embedAccessToken = authHeader.split(" ")[1];
        if (!embedAccessToken) {
            return NextResponse.json({ error: "Embeded access token is missing" }, { status: 400 });
        }
        const embedAccessTokenVerified = SallaEmbedAuth.verifyToken(embedAccessToken);
        if (!embedAccessTokenVerified.success) {
            return NextResponse.json({ error: embedAccessTokenVerified.error }, { status: 400 });
        }

        const { merchant_id } = embedAccessTokenVerified.data;
        console.log(merchant_id, typeof merchant_id);

        const accessToken = await AuthService.getValidAccessToken(merchant_id);

        if (!accessToken) {
            return NextResponse.json({ error: "Access token is missing" }, { status: 400 });
        }


        const query = request.nextUrl.searchParams.get("query");
        const url = `https://api.salla.dev/admin/v2/products${query ? `?keyword=${query}` : ""}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            },
            redirect: "follow"
        });
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to get products" }, { status: response.status });
        }
        const { data } = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error getting products:", error);
        return NextResponse.json({ error: "Failed to get products" }, { status: 500 });
    }
}   