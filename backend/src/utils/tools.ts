// tools/staticData.ts

import axios from "axios";

export const getLounge = async () => {
    return {
        NMIA: "Club Kingston / Norman Manley Intl",
        SIA: "Club Mobay / Sangster Intl",
    };
};

export async function getSchedule({
    direction, airportid, traveldate , flightId
}: {
    direction: string, airportid: string, traveldate: string, flightId:string
}) {
    // console.log(process.env.STATIC_USERNAME
    //     , process.env.STATIC_SESSIONID)
    console.log('hey from get schedule')
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
        const result =  response.data.data.flightschedule.filter((flightDetail)=> flightDetail.flightId === flightId );
        return result;      
    } catch (error) {
        console.log(error)
    }
    return { message: "we have an error" }
}

export async function reserveCart({
    adulttickets,
    arrivalscheduleid,
    childtickets,
    departurescheduleid,
    productid,
}:{
    adulttickets:number,
    arrivalscheduleid:number,
    childtickets:number,
    departurescheduleid:number,
    productid:string,
}) {
    if(productid === "ARRIVALONLY"){
        departurescheduleid = 0
    }else if(productid === "DEPARTURELOUNGE"){
        arrivalscheduleid = 0
    }
    const request = {
        failstatus:0,
        sessionid:process.env.STATIC_SESSIONID,
        username: process.env.STATIC_USERNAME,
        request:{
            adulttickets:adulttickets,
            arrivalscheduleid:arrivalscheduleid,
            cartitemid:0,
            childtickets:childtickets,
            departurescheduleid:departurescheduleid,
            distributorid:"",
            paymenttype:"GUESTCARD",
            productid:productid,
            ticketsrequested: adulttickets + childtickets
        }
    }
    try {
        console.log('check before network call')
        const response = await axios.post(`${process.env.devServer}/reservecartitem`, request);
        console.log(response.data.data,"response from Reserve Cart")
        return response.data.data;
    } catch (error) {
        console.log(error)
    }
    return { message: "we have an error in reserving cart" }    
}

// export async function setContact() {
    
// }