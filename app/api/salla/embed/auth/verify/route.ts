// A route to recieve salla embeddd sdk auth token, introspect it and return the result,
// utilizing the SallaEmbedAuth class.

import { SallaEmbedAuth } from "@/services/salla/embed-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const sallaToken = request.nextUrl.searchParams.get("token");
        if (!sallaToken) {
            return NextResponse.json({ error: "Salla token is missing" }, { status: 400 });
        }
        const inspectResult = await SallaEmbedAuth.inspect(sallaToken);
        if (!inspectResult.success) {
            return NextResponse.json({ error: inspectResult.error }, { status: 400 });
        }
        const jwtToken = SallaEmbedAuth.createToken(inspectResult.data);

        const response = NextResponse.json({ success: true });

        // Set Partitioned HttpOnly Cookie (CHIPS - Cookies Having Independent Partitioned State)
        response.cookies.set("embedToken", jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            partitioned: true,
            path: "/",
            maxAge: 30 * 60, // 30 minutes
        });

        // Ensure Partitioned attribute is explicitly formatted on Set-Cookie header
        const setCookie = response.headers.get("set-cookie");
        if (setCookie && !setCookie.toLowerCase().includes("partitioned")) {
            response.headers.set("set-cookie", `${setCookie}; Partitioned`);
        }

        return response;
    } catch (error) {
        console.error("Error verifying Salla token:", error);
        return NextResponse.json({ error: "Failed to verify Salla token" }, { status: 500 });
    }
}