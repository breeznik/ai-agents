import type { EnumDeclaration } from 'typescript';
import z from 'zod';


export type contactSchema = {
    email: string;
    firstname: string;
    lastname: string;
    phone: string;
    cartitemid: number;
    sessionid:string;
}

export type reservationSchema = {
    adulttickets: number;
    childtickets: number;
    scheduleData: any | null,
    productid: "DEPARTURELOUNGE" | "ARRIVALONLY" | "ARRIVALBUNDLE";
    sessionid:string;
}

export type scheduleSchema = {
    direction: "A" | "D";
    airportid: "SIA" | "NMIA";
    traveldate: string;
    flightId: any;
    sessionid:string;
}

export type paymentSchema = {
    state:any
}