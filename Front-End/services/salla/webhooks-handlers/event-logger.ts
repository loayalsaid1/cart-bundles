// A class that takes an event and saves it ini teh eventsLogs table

import { db } from "@/lib/db";
import { eventLogs } from "@/lib/db/entities";
import { SallaAppEventBase } from "../types/salla-events";



export class EventLogger {
    // it takes the data of the event in json format
    // and the event id from the request headers

    static async logEvent(payload: SallaAppEventBase) {
        try {
            await db.insert(eventLogs).values({
                eventName: payload.event,
                eventData: payload,
            });
        } catch (error) {
            console.error("Error logging event:", error);
        }
    }
}
