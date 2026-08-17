// Route to handle salla webhooks and based on event, pass it to appropiate handler in teh services
import { NextRequest, NextResponse } from "next/server";
import { AppEventsHandlers } from "../../../../../services/salla/webhooks-handlers/app-events";
import { SallaAppAuthorizedEvent, SallaAppEventBase } from "@/services/salla/types/salla-events";
import { EventLogger } from "@/services/salla/webhooks-handlers/event-logger";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {

    const rawBody = await request.text();
    const signature = request.headers.get("x-salla-signature");

    const validation = validateWebhookRequest(rawBody, signature!);
    if (!validation.success) {
      let status = 401;
      if (validation.error === "Missing salla secret") {
        status = 500;
      }
      return NextResponse.json({ status: "error", message: validation.error }, { status });
    }

    const data = JSON.parse(rawBody) as SallaAppEventBase;
    EventLogger.logEvent(data);
    console.log("Webhook received:", data);

    const event = data.event;
    switch (event) {
      // case "app.installed":
      //   await AppEventsHandlers.handleAppInstalled(data as SallaAppEventBase);
      //   break;
      case "app.store.authorize":
        await AppEventsHandlers.handleAppAuthorized(data as SallaAppAuthorizedEvent);
        break;
      case "app.uninstalled":
        await AppEventsHandlers.handleAppUninstalled(data as SallaAppEventBase);
        break;
      default:
        console.warn("Unhandled event:", event);
        console.warn("Unhandled Event Data :", data)
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json({ status: "error", message: "Error handling webhook" }, { status: 500 });
  }
}

// Extract the vaidation logic in the function 
// return {sucess, and "error message as invlaide or missing syngicture or salla secret"}
function validateWebhookRequest(rawBody: string, signature: string): { success: boolean, error?: string } {
  const secret = process.env.SALLA_WEBHOOK_SECRET!;
  if (!secret) {
    return { success: false, error: "Missing salla secret" };
  }
  if (!signature) {
    return { success: false, error: "Missing signature" };
  }
  const computedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const signatureMatches = signature === computedSignature;
  if (!signatureMatches) {
    return { success: false, error: "Invalid signature" };
  }
  return { success: true };
}