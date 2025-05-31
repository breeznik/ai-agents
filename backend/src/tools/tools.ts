// tools/staticData.ts

import axios from "axios";

export const getLounge = async () => {
    return {
        NMIA: "Club Kingston / Norman Manley Intl",
        SIA: "Club Mobay / Sangster Intl",
    };
};

// export const getSchedule = async () => {
//     return [
//         { flight: "AI203", departure: "10:00", arrival: "13:00", gate: "A12" },
//         { flight: "BA142", departure: "14:30", arrival: "17:45", gate: "B4" },
//     ];
// };

export const getReservation = async () => {
    return [
        {
            id: "R001",
            name: "John Doe",
            lounge: "SkyLounge",
            time: "09:30 AM",
            confirmed: true,
        },
        {
            id: "R002",
            name: "Jane Smith",
            lounge: "Elite Club",
            time: "02:00 PM",
            confirmed: false,
        },
    ];
}

export async function getSchedule({
    direction, airportid, traveldate
}: {
    direction: string, airportid: string, traveldate: string
}) {
    console.log(process.env.static_username
        , process.env.static_sessionId)
    const request = {
        username: process.env.static_username,
        sessionid: process.env.static_sessionId,
        failstatus: 0,
        request: {
            direction: direction,
            airportid: airportid,
            traveldate: traveldate,
        },
    };
    try{
        const response = await axios.post(`${process.env.devServer}/getschedule`, request);
        return response.data.data;
    }catch(error){
        console.log(error)
    }
    return {message: "we have an error"}
}