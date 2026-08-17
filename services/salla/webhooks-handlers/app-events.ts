// app-events.ts A class handling app events , for app.installed it makes the merchant with merchant id active and for authorized it creates an entry and 
// saves the access, refresh and expiry with teh merchant id
// it has a function that vaidates if the event name exists and alighns with function handler
// it ignores the other function files in teh direty, handling the events here 
// and will be imported in the the route and called against the events

import { db } from "@/lib/db"
import { merchants } from "@/lib/db/entities"   
import { desc, eq } from "drizzle-orm"
import { SallaAppAuthorizedEvent, SallaAppEventBase } from "../types/salla-events";


export class AppEventsHandlers {
    // a static function that checks if the even name exists in the file and returns true otherwise false
    // throw an error if not. and logs with the stack the event name it expected and got
    static validateEventType(data: SallaAppEventBase, eventName: string): boolean {
        if (data.event === eventName) {
            return true;
        }
        throw new Error(`Event name ${eventName} passed to wrong or non existant handler `);
    }
    
    // a function that handles app authorized event
    static async handleAppAuthorized(data: SallaAppAuthorizedEvent) {
        this.validateEventType(data, 'app.store.authorize')

        const { merchant, data: payload } = data
        payload.expires *= 1000

        
        await db.insert(merchants).values({
            merchantId: merchant,
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            expiresAt: new Date(payload.expires),
            isActive: true,
        }).onConflictDoUpdate({
            target: [merchants.merchantId],
            set: {
                accessToken: payload.access_token,
                refreshToken: payload.refresh_token,
                expiresAt: new Date(payload.expires),
                isActive: true,
            }
        });
    }

    static async handleAppUninstalled(data: SallaAppEventBase) {
        this.validateEventType(data, 'app.uninstalled')

        await db.update(merchants).set({ isActive: false }).where(eq(merchants.merchantId, data.merchant));
    }
}