// @ts-nocheck
import axios from 'axios';
import type { contactSchema, reservationSchema, scheduleSchema } from '@/utils/types';
import CryptoJS from 'crypto-js';

export async function setContact({ email,
    firstname,
    lastname,
    phone, cartitemid, sessionid }: contactSchema) {
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
        sessionid: sessionid,
        username: process.env.STATIC_USERNAME,
    };

    try {
        const response = await axios.post(
            `${process.env.DEVSERVER}/setcontact`,
            request
        );
        return "your primary contacts are submitted";
    } catch (error) {
        console.log(error);
    }
    return "we have an error in setting contact";
}

export async function reserveCart({
    adulttickets,
    childtickets,
    scheduleData,
    productid,
    sessionid
}: reservationSchema) {
    console.log('hey i got hit', scheduleData);
    const scheduleBuilder = {
        arrivalscheduleid: 0,
        departurescheduleid: 0,
    };

    // Defensive checks for scheduleData structure
    if ((productid === "ARRIVALONLY" || productid === "ARRIVALBUNDLE") && (!scheduleData?.A || typeof scheduleData.A.scheduleId !== 'number')) {
        return { error: "Missing or invalid scheduleData.A.scheduleId", scheduleData, adulttickets, childtickets, productid };
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
        sessionid: sessionid,
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
            `${process.env.DEVSERVER}/reservecartitem`,
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
    sessionid
}: scheduleSchema) {
    const request = {
        username: process.env.STATIC_USERNAME,
        sessionid: sessionid,
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

export async function processPayment(state: any) {
    const sessionid = state.sessionid

    const getCartItemsReq = {
        failstatus: 0,
        request: {},
        username: process.env.STATIC_USERNAME,
        sessionid
    }

    const getCartItems = await axios.post(`${process.env.DEVSERVER}/getcartitems`, getCartItemsReq)

    const amount = state.totalAmount || 0

    const commonCart = Object.values(state.cart)

    const orderReq = {
        failstatus: 0,
        request: {
            source: "OBI-MAIN",
            amount: amount
        },
        sessionid: sessionid,
        username: process.env.STATIC_USERNAME
    }

    const orderidres = await axios.post(`${process.env.DEVSERVER}/getorderid`, orderReq)

    function formatCreditCardExpiryFAC(cardMonth, cardYear) {
        let cardExpiry = cardMonth + cardYear?.slice(-2);
        return cardExpiry;
    }
    const encryptData = (data, iv, key) => {
        // Ensure key is a WordArray
        const keyWA = typeof key === "string" ? CryptoJS.enc.Base64.parse(key) : key;
        const value = CryptoJS.AES.encrypt(
            CryptoJS.enc.Utf8.parse(data),
            keyWA,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        return value.ciphertext.toString(CryptoJS.enc.Base64);
    };

    const encryptCardDetails = (cardholderDetails, key) => {
        const iv = CryptoJS.lib.WordArray.random(16);
        const cardNumber = encryptData(cardholderDetails?.cardnumber, iv, key);
        const cardHolderName = encryptData(cardholderDetails?.cardholdername, iv, key);
        const cvv = encryptData(cardholderDetails?.cvv, iv, key);
        const [month, year] = cardholderDetails?.expirydate?.split("/");
        const expiryDate = encryptData(formatCreditCardExpiryFAC(month, year), iv, key);

        return {
            iv: CryptoJS.enc.Base64.stringify(iv),
            cardNumber: cardNumber,
            cardHolderName: cardHolderName,
            cvv: cvv,
            expiryDate: expiryDate,
        };
    };

    const encryptedData = encryptCardDetails(state.paymentInformation, process.env.STATIC_ENCRYPTION_KEY);

    const addconfirmationLogReq = {
        failstatus: 0,
        request: {
            affiliateid: "!",
            cart: commonCart,
            distributorid: "",
            httpreferrer: "",
            orderid: orderidres.data.data.orderid,
            payment: {
                charged: "Y",
                creditcard: {
                    amount: amount,
                    authorizationnumber: 123456,
                    cardholdername: state.paymentInformation.cardholdername,
                    cardnumber: state.paymentInformation.cardnumber.slice(-4),
                    cardtype: state.paymentInformation.cardtype.toUpperCase(),
                    currency: "USD",
                    email: state.paymentInformation.cardholderemail,
                },
                paymenttype: "GUESTCARD",
            },
            referrerid: "",
            sendconfirmation: {
                copyto: "",
                sendto: state.paymentInformation?.cardholderemail,
            },
            subaffiliateid: 0
        },
        sessionid: sessionid,
        username: process.env.STATIC_USERNAME
    }

    const processCardReq = {
        failstatus: 0,
        request: {
            actiontype: "CHARGECARD",
            creditcard: {
                amount: amount,
                cardtype: state.paymentInformation.cardtype.toUpperCase(),
                cardnumber: encryptedData.cardNumber,
                cardholder: encryptedData.cardHolderName,
                expirydate: encryptedData.expiryDate,
                cvv: encryptedData.cvv,
                email: state.paymentInformation.cardholderemail,
                iv: encryptedData.iv,
            },
            orderid: orderidres.data.data.orderid,
        },
        sessionid: sessionid,
        username: process.env.STATIC_USERNAME,
    }
    

    const logResponse = await axios.post(`${process.env.DEVSERVER}/addconfirmationlog`, addconfirmationLogReq);

    const processCard = await axios.post(`${process.env.DEVSERVER}/processcard`, processCardReq);
    state.paymentHtml = processCard.data.data?.html || "";

    const confirmCartReq = {
        failstatus: 0,
        request: {
            affiliateid: "!",
            cart: commonCart,
            distributorid: "",
            httpreferrer: "",
            payment: {
                charged: "Y",
                creditcard: {
                    amount: amount,
                    authorizationnumber: "123456",
                    cardholder: state.paymentInformation.cardholdername,
                    cardnumber: state.paymentInformation.cardnumber.slice(-4),
                    cardtype: state.paymentInformation.cardtype.toUpperCase(),
                    currency: "USD",
                    email: state.paymentInformation.cardholderemail || "nikunjrathi2308@gmail.com",
                },
                paymenttype: "GUESTCARD",
            },
            referrerid: "",
            sendconfirmation: {
                copyto: "",
                sendto: state.paymentInformation.cardholderemail,
            },
            subaffiliateid: 0,
        },
        sessionid: sessionid,
        username: process.env.STATIC_USERNAME
    }

    const confirmCart = await axios.post(`${process.env.DEVSERVER}/confirmcart`, confirmCartReq);
    state.confirmcart = confirmCart.data
    state.logresponse = logResponse.data
    return { state };
}