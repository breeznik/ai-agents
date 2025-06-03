// tools/staticData.ts

import axios from "axios";

export const getLounge = async () => {
    return {
        NMIA: "Club Kingston / Norman Manley Intl",
        SIA: "Club Mobay / Sangster Intl",
    };
};

export async function getSchedule({
    direction, airportid, traveldate
}: {
    direction: string, airportid: string, traveldate: string
}) {
    console.log(process.env.STATIC_USERNAME
        , process.env.STATIC_SESSIONID)
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
        const response = await axios.post(`${process.env.devServer}/getschedule`, request);
        return response.data.data;
    } catch (error) {
        console.log(error)
    }
    return { message: "we have an error" }
}