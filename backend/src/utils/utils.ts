import axios from "axios";
import ControllerModel from "../models/controller.model";
import CryptoJS from 'crypto-js';

export const getOrCreateController = async (sessionId: string) => {
    let FindSession: any = await ControllerModel.findOne({
        sessionId: sessionId
    })

    if (!FindSession) {
        await ControllerModel.create({
            sessionId
        })
        let FindSession: any = await ControllerModel.findOne({
            sessionId: sessionId
        })
        const tempSession = await login();
        console.log('temp sesison', tempSession)
        FindSession.bookingSteps = {
            tempSession
        };

        return FindSession;
    }
    console.log('retured session ', FindSession)
    return FindSession;
};


export const login = async () => {
    try {
        const requestObj = {
            failstatus: 0,
            request: {
                username: process.env.STATIC_USERNAME,
                password: process.env.STATIC_PASSWORD,
                marketid: "JAM",
                languageid: "en",
                getpaymentgateway: "Y"
            }
        }
        const response = await axios.post(`${process.env.devServer}/login`, requestObj);
        console.log('response from login ', response.data.data.sessionid)
        return response.data.data.sessionid
    } catch (error) {
        console.log(error)
    }
    return null;
}
const base64ToWordArray = (base64) => {
    return CryptoJS.enc.Base64.parse(base64);
};

const encryptData = (data, iv, key) => {
    const value = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), base64ToWordArray(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return value.ciphertext.toString(CryptoJS.enc.Base64)
}
export function formatCreditCardExpiryFAC(cardMonth, cardYear) {
    let cardExpiry = cardMonth + cardYear?.slice(-2);
    return cardExpiry;
}
const wordArrayToBase64 = (wordArray) => {
    return CryptoJS.enc.Base64.stringify(wordArray);
};
export const encryptCardDetails = (cardholderDetails, key) => {
    const iv = CryptoJS.lib.WordArray.random(16);
    const cardNumber = encryptData(cardholderDetails?.cardNumber, iv, key);
    const cardHolderName = encryptData(cardholderDetails?.name, iv, key);
    const cvv = encryptData(cardholderDetails?.cvv, iv, key);
    const expiryDate = encryptData(formatCreditCardExpiryFAC(cardholderDetails?.cardMonth, cardholderDetails?.cardYear), iv, key);

    return {
        iv: wordArrayToBase64(iv),
        cardNumber: cardNumber,
        cardHolderName: cardHolderName,
        cvv: cvv,
        expiryDate: expiryDate,
    };
};


export const decryptCardDetails = (encryptedCardNumber, key, iv) => {
    try {
        const ivWordArray = base64ToWordArray(16);
        const keyWordArray = base64ToWordArray(key);
        const encrypted = base64ToWordArray(encryptedCardNumber);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encrypted },
            keyWordArray,
            {
                iv: ivWordArray,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        return CryptoJS.enc.Utf8.stringify(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};