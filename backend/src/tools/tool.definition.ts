import type { contactSchema, reservationSchema, scheduleSchema } from "@/utils/types";
import z from 'zod'
import { getSchedule, reserveCart, setContact } from "./tool";

const scheduleSchemaObj = {
    airportid: z.enum(['SIA', 'NMIA']),
    direction: z.enum(['A', 'D']),
    traveldate: z.string().regex(/^\d{8}$/, {
        message: "traveldate must be in yyyymmdd format (e.g. 20250531)",
    }),
    flightId: z.string(),
}
const reservationSchemaObj = {
    adulttickets: z.number(),
    childtickets: z.number(),
    scheduleData: z.any(),
    productid: z.enum(["DEPARTURELOUNGE", "ARRIVALONLY", "ARRIVALBUNDLE"]),
}
const contactSchemaObj = {
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    phone: z.string(),
    cartitemid: z.number()
}

export const scheduleTool = {
    name: "getSchedule",
    description: "This tool validates the client flight schedule with the flights schedule avaialble in service",
    paramsSchema: scheduleSchemaObj,
    cb: async ({ airportid, direction, traveldate, flightId }: scheduleSchema) => {
        const data = await getSchedule({
            airportid,
            direction,
            traveldate,
            flightId,
        });

        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}

export const reservationTool = {
    name: "reserveLounge",
    description: "this tool determines if the reservation can be done for the specified lounge at the given schedule",
    paramsSchema: reservationSchemaObj,
    cb: async ({ adulttickets, childtickets, scheduleData, productid }: reservationSchema) => {
        const data = await reserveCart({ adulttickets, childtickets, scheduleData, productid });
        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}

export const contactTool = {
    name: "setcontact",
    description: "This is tool is used to save customer's contact information for product",
    paramsSchema: contactSchemaObj,
    cb: async ({ email, firstname, lastname, phone, cartitemid }: contactSchema) => {
        const data = await setContact({ email, firstname, lastname, phone, cartitemid });
        return {
            content: [{ type: "text", text: JSON.stringify(data) }],
        };
    }
}