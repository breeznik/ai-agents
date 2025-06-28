import axios from 'axios';
import type { contactSchema, reservationSchema, scheduleSchema } from '@/utils/types';

export async function setContact({ email,
    firstname,
    lastname,
    phone, cartitemid }: contactSchema) {
    const request = {
        failstatus: 0,
        request: {
            contact: {
                cartitemid,
                email,
                firstname,
                lastname,
                phone,
                title: "MR.",
            },
        },
        sessionid: process.env.STATIC_SESSIONID,
        username: process.env.STATIC_USERNAME,
    };

    try {
        const response = await axios.post(
            `${process.env.devServer}/setcontact`,
            request
        );
        return "your primary contacts are submitted";
    } catch (error) {
        console.log(error);
    }
    return "we have an error in reserving cart";
}

export async function reserveCart({
    adulttickets,
    childtickets,
    scheduleData,
    productid,
}: reservationSchema) {
    console.log('hey i got hit', scheduleData);
    const scheduleBuilder = {
        arrivalscheduleid: 0,
        departurescheduleid: 0,
    };

    // Defensive checks for scheduleData structure
    if ((productid === "ARRIVALONLY" || productid === "ARRIVALBUNDLE") && (!scheduleData?.A || typeof scheduleData.A.scheduleId !== 'number')) {
        return { error: "Missing or invalid scheduleData.A.scheduleId"  , scheduleData , adulttickets , childtickets , productid};
    }
    if ((productid === "DEPARTURELOUNGE" || productid === "ARRIVALBUNDLE") && (!scheduleData?.D || typeof scheduleData.D.scheduleId !== 'number')) {
        return { error: "Missing or invalid scheduleData.D.scheduleId" };
    }

    if (productid === "ARRIVALONLY" || productid === "ARRIVALBUNDLE") {
        scheduleBuilder.arrivalscheduleid = scheduleData.A.scheduleId;
    }
    if (productid === "DEPARTURELOUNGE" || productid === "ARRIVALBUNDLE") {
        scheduleBuilder.departurescheduleid = scheduleData.D.scheduleId;
    }
    const request = {
        failstatus: 0,
        sessionid: process.env.STATIC_SESSIONID,
        username: process.env.STATIC_USERNAME,
        request: {
            adulttickets: adulttickets,
            arrivalscheduleid: scheduleBuilder.arrivalscheduleid,
            cartitemid: 0,
            childtickets: childtickets,
            departurescheduleid: scheduleBuilder.departurescheduleid,
            distributorid: "",
            paymenttype: "GUESTCARD",
            productid: productid,
            ticketsrequested: adulttickets + childtickets,
        },
    };
    try {
        const response = await axios.post(
            `${process.env.devServer}/reservecartitem`,
            request
        );
        return response.data.data;
    } catch (error) {
        console.log(error);
    }
    return "we have an error in reserving cart";
}

export async function getSchedule({
    direction,
    airportid,
    traveldate,
    flightId,
}: scheduleSchema) {
    const request = {
        username: process.env.STATIC_USERNAME,
        sessionid: process.env.STATIC_SESSIONID,
        failstatus: 0,
        request: {
            direction: direction,
            airportid: airportid,
            traveldate: traveldate,
        },
    };
    try {
        const response = await axios.post(
            `${process.env.DEVSERVER}/getschedule`,
            request
        );
        const result = response?.data?.data?.flightschedule?.filter(
            (flightDetail: any) => flightDetail?.flightId === flightId
        );
        console.log('tool result', result)
        return result[0];
    } catch (error) {
        console.log(error);
    }
    return { message: "we have an error" };
}