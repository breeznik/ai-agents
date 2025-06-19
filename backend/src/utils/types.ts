import type { EnumDeclaration } from 'typescript';
import z from 'zod';


export type contactSchema = {
    email: string;
    firstname: string;
    lastname: string;
    phone: string;
    cartitemid: number;
}

export type reservationSchema = {
    adulttickets: number;
    childtickets: number;
    arrivalscheduleid: number,
    departurescheduleid: number,
    productid: "DEPARTURELOUNGE" | "ARRIVALONLY" | "ARRIVALBUNDLE";
}

export type scheduleSchema = {
    direction: "A" | "D";
    airportid: "SIA" | "NMIA";
    traveldate: string;
    flightId: any;
}