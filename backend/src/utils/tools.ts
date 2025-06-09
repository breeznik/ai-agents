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
    childtickets,
    airportid, 
    traveldate, 
    flightId,
    productid
}:{
    adulttickets:number,
    childtickets:number,
    airportid: string, 
    traveldate: string, 
    flightId:string
    productid:"DEPARTURELOUNGE"| "ARRIVALONLY"| "ARRIVALBUNDLE",
}) {
    console.log("hey from reserved Cart")
    let arrivalscheduleid = 0,departurescheduleid = 0;
    if(productid === "ARRIVALONLY"){
        const resultFromgetSchedule =  await getSchedule({ direction:"A" ,airportid, traveldate, flightId})
        console.log(resultFromgetSchedule,"result from schedule id")
        arrivalscheduleid = resultFromgetSchedule[0].scheduleId
    }else if(productid === "DEPARTURELOUNGE"){
        const resultFromgetSchedule =  await getSchedule({ direction:"D" ,airportid, traveldate, flightId})
        departurescheduleid =  resultFromgetSchedule[0].scheduleId 
    }else{
        let resultFromgetSchedule =  await getSchedule({ direction:"A" ,airportid, traveldate, flightId})
        arrivalscheduleid = resultFromgetSchedule[0].scheduleId
        resultFromgetSchedule =  await getSchedule({ direction:"D" ,airportid, traveldate, flightId})
        departurescheduleid = resultFromgetSchedule[0].scheduleId
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
        console.log('check before network call',request)
        const response = await axios.post(`${process.env.devServer}/reservecartitem`, request);
        console.log(response.data,"response from Reserve Cart")
        return response.data.data;
    } catch (error) {
        console.log(error)
    }
    return { message: "we have an error in reserving cart" }    
}

export async function setContact(
    {
     cartitemid,
     email, 
     firstname, 
     lastname, 
     phone, 
    }:{
    cartitemid:number,
    email:string,
    firstname:string,
    lastname:string,
    phone:string,
}) {
    const request = {
        failstatus:0,
        request:{
            contact:{
                cartitemid,
                email,
                firstname,
                lastname,
                phone,
                title:"MR."
            }
        },
        sessionid:process.env.STATIC_SESSIONID,
        username: process.env.STATIC_USERNAME
    }

    try {
        console.log('check before network call',request)
        const response = await axios.post(`${process.env.devServer}/setcontact`, request);
        console.log(response.data,"response from Reserve setcontact")
        return {message:"your primary contacts are submitted"}
    } catch (error) {
        console.log(error)
    }
    return { message: "we have an error in reserving cart" }  
}