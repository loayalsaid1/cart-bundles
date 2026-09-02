// A service to handle auth stuff.get a valid access token from the merchnats table by the merchnatId.
// If expired, call a function to get a new access token from salla API and update the merchant table.
// contains a function to get th token, another to validate token.
// if not another one will get the new token
// a third one to update the actual token and return it.
// the getValidAccessToken orcherstrate all this

import { db } from "@/lib/db";
import { merchants } from "@/lib/db/entities";
import { eq } from "drizzle-orm";

export type SallaTokenData = {
    merchantId: number;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

export class AuthService {

    static async getValidAccessToken(merchantId: number): Promise<string | null> {
        // get token
        const tokenData = await this.getToken(merchantId);
        if (!tokenData) {
            return null;
        }
        // validate token
        if (tokenData.expiresAt.getTime() - 300000 > Date.now()) {
            return tokenData.accessToken;
        }
        // if not valid, get new token
        const newToken = await this.getNewToken(merchantId, tokenData.refreshToken);
        if (!newToken) {
            throw new Error('Failed to get new token');
        }
        await this.updateToken(merchantId, newToken);
        return newToken.accessToken;
    }

    static async getToken(merchantId: number): Promise<SallaTokenData | null> {
        // get token from merchnats table
        const merchant = await db.query.merchants.findFirst({
            where: eq(merchants.merchantId, merchantId),
            columns: {
                merchantId: true,
                accessToken: true,
                refreshToken: true,
                expiresAt: true
            },
        });
        if (!merchant) {
            return null;
        }
        return merchant;
    }


    static async getNewToken(merchantId: number, refreshToken: string): Promise<SallaTokenData | undefined> {
        const url = "https://accounts.salla.sa/oauth2/token";

        const details: Record<string, string> = {
            client_id: process.env.SALLA_CLIENT_ID!,
            client_secret: process.env.SALLA_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        };

        const formBody = Object.keys(details)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
            .join('&');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formBody
            });

            if (!response.ok) {
                console.log(await response.text())
                throw Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return {
                merchantId: merchantId,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(Date.now() + parseInt(data.expires_in) * 1000),
            };
        } catch (error) {
            console.error('Failed to refresh Salla access token:', error);
        }
    }

    static async updateToken(merchantId: number, newToken: SallaTokenData): Promise<void> {
        await db.update(merchants).set({
            accessToken: newToken.accessToken,
            refreshToken: newToken.refreshToken,
            expiresAt: newToken.expiresAt,
            isActive: true,
        }).where(eq(merchants.merchantId, merchantId));
    }
}
