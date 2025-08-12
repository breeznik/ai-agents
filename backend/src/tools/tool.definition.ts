import type { contactSchema, paymentSchema, reservationSchema, scheduleSchema } from "@/utils/types";
import z from 'zod'
import { getSchedule, processPayment, payment2, reserveCart, setContact } from "./tool";

const scheduleSchemaObj = {
    airportid: z.enum(['SIA', 'NMIA']),
    direction: z.enum(['A', 'D']),
    traveldate: z.string().regex(/^\d{8}$/, {
        message: "traveldate must be in yyyymmdd format (e.g. 20250531)",
    }),
    flightId: z.string(),
    sessionid: z.string()

}
const reservationSchemaObj = {
    adulttickets: z.number(),
    childtickets: z.number(),
    scheduleData: z.any(),
    productid: z.enum(["DEPARTURELOUNGE", "ARRIVALONLY", "ARRIVALBUNDLE"]),
    sessionid: z.string()
}
const contactSchemaObj = {
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    phone: z.string(),
    cartitemid: z.number(),
    sessionid: z.string()
}
const paymentSchemaObj = z.object({
    state: z.any()
})

export const scheduleTool = {
    name: "schedule",
    description: "This tool validates the client flight schedule with the flights schedule avaialble in service",
    paramsSchema: scheduleSchemaObj,
    cb: async ({ airportid, direction, traveldate, flightId, sessionid }: scheduleSchema) => {
        const data = await getSchedule({
            airportid,
            direction,
            traveldate,
            flightId,
            sessionid
        });

        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}

export const reservationTool = {
    name: "reservation",
    description: "this tool determines if the reservation can be done for the specified lounge at the given schedule",
    paramsSchema: reservationSchemaObj,
    cb: async ({ adulttickets, childtickets, scheduleData, productid, sessionid }: reservationSchema) => {
        const data = await reserveCart({ adulttickets, childtickets, scheduleData, productid, sessionid });
        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}

export const contactTool = {
    name: "contact",
    description: "This is tool is used to save customer's contact information for product",
    paramsSchema: contactSchemaObj,
    cb: async ({ email, firstname, lastname, phone, cartitemid, sessionid }: contactSchema) => {
        const data = await setContact({ email, firstname, lastname, phone, cartitemid, sessionid });
        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}

export const paymentTool = {
    name: "payment",
    description: "this tool is used to process the payment for booking",
    paramsSchema: paymentSchemaObj.shape,
    cb: async ({ state }: paymentSchema) => {
        const data = await processPayment(state);
        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        }
    }

}

export const payment2Tool = {
    name: "payment2",
    description: "this tool is used to confirm the cart after payment processing",
    paramsSchema: paymentSchemaObj.shape,
    cb: async ({ state }: paymentSchema) => {
        const data = await payment2(state);
        // Extract only serializable data to avoid circular references
        const result = {
            success: !('error' in data) || !data.error,
            error: ('error' in data) ? data.error : null,
            confirmcart: data.state?.confirmcart?.data || null
        };
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
        }
    }
}