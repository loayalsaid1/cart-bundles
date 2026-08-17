// A class to handle salla embed authentication for an app, this will introspect salla token
// reflection: 
/**
 * salla gets token frm front-end  via sdk
 * I get n in backend, call salla introspection api
 * get merchnatId, and userId ,or storeId instead of merchantId
 * I make a JWT and send it to the front-end
 * they store it somewhere.. probaby in memory or so..
 * I will expect that in all my api calls I add this token in the header
 * if it expired, I wiil send 401 and the front will make a refresh call to start over from the sdk
 * 
 * I need a class to introspect salla api key, reated a JWT token and return it, inspect expiry or invalidatio of the toen as wel
 * i twi use json web tokens and it wi set an expirey r 30 in the optios fied
 * the inspect wil have a 2 result interface or whatever it's caled like an objet with success and  errr field, and it can has TokenExpired or other names
 * (in the route, if token expired, 403, if not 400 invaid token regardless or err)
 * 
 */
import jwt, { JsonWebTokenError } from "jsonwebtoken";

export const TOKEN_EXPIRED_ERROR = "TokenExpiredError";

// Adjusted: 'exp' is usually a number (UNIX timestamp) in JWTs/APIs, not a Date object.
export interface SallaTokenData {
    merchant_id: number;
    user_id: number;
}

type SallaTokenInspectResult = 
    | { success: true; data: SallaTokenData & { salla_exp?: number } } 
    | { success: false; error?: string };

type LocalJWTVerifyResult = 
    | { success: true; data: SallaTokenData } 
    | { success: false; error: typeof TOKEN_EXPIRED_ERROR | string };

export class SallaEmbedAuth {
    static async inspect(token: string): Promise<SallaTokenInspectResult> {
        try {
            const url = "https://api.salla.dev/exchange-authority/v1/introspect";
            const response = await fetch(url, {
                method: "POST", 
                headers: {
                    "S-Source": process.env.SALLA_APP_ID || "",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                return { success: false, error: `Salla API returned ${response.status}` };
            }

            const introspectionResult = await response.json();
            
            if (introspectionResult.success) {
                const data = introspectionResult.data;
                return {
                    success: true,
                    data: {
                        merchant_id: data.merchant_id,
                        user_id: data.user_id,
                        salla_exp: data.exp, // Keep it separate from our local token's 'exp'
                    }
                };
            }

            return { success: false, error: "Salla returned success: false" };

        } catch (err) {
            // Catch network errors (e.g., Salla API is down)
            return { success: false, error: err instanceof Error ? err.message : "Unknown fetch error" };
        }
    }

    static createToken(data: SallaTokenData): string {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET environment variable is missing.");
        }

        const payload = {
            merchant_id: data.merchant_id,
            user_id: data.user_id,
        };

        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '30m', 
        });
    }

    static verifyToken(token: string): LocalJWTVerifyResult {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET environment variable is missing.");
        }

        try {
            const data = jwt.verify(token, process.env.JWT_SECRET) as SallaTokenData;
            return { success: true, data };
        } catch (error: unknown) { 
            if (error instanceof JsonWebTokenError) {
                if (error.name === TOKEN_EXPIRED_ERROR) {
                    return { success: false, error: TOKEN_EXPIRED_ERROR };
                }
                return { success: false, error: error.message };
            }
            return { success: false, error: "Invalid token" };
        }
    }
}