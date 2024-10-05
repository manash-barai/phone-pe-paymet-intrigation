


const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
require("dotenv").config()

const app = express();

app.use(express.json());
app.use(cors());


const MERCHANT_KEY=process.env.MERCHANT_KEY
const MERCHANT_ID=process.env.MERCHANT_ID



const MERCHANT_BASE_URL=process.env.MERCHANT_BASE_URL
const MERCHANT_STATUS_URL=process.env.MERCHANT_STATUS_URL
const redirectUrl="http://localhost:8000/status"

const successUrl=process.env.CLIENT_SUCCESS_URL
const failureUrl=process.env.CLIENT_FAIL_URL


app.post('/create-order', async (req, res) => {

    const {name, mobileNumber, amount} = req.body;
    const orderId = uuidv4()

    //payment
    const paymentPayload = {
        merchantId : MERCHANT_ID,
        merchantUserId: name,
        mobileNumber: mobileNumber,
        amount : amount * 100,
        merchantTransactionId: orderId,
        redirectUrl: `${redirectUrl}/?id=${orderId}`,
        redirectMode: 'POST',
        paymentInstrument: {
            type: 'PAY_PAGE'
        }
    }

    const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
    const keyIndex = 1
    const string  = payload + '/pg/v1/pay' + MERCHANT_KEY
    const sha256 = crypto.createHash('sha256').update(string).digest('hex')
    const checksum = sha256 + '###' + keyIndex

    const option = {
        method: 'POST',
        url:MERCHANT_BASE_URL,
        headers: {
            accept : 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
        },
        data :{
            request : payload
        }
    }
    try {
        
        const response = await axios.request(option);
        console.log(response.data.data.instrumentResponse.redirectInfo.url)
         res.status(200).json({msg : "OK", url: response.data.data.instrumentResponse.redirectInfo.url})
    } catch (error) {
        console.log("error in payment", error)
        res.status(500).json({error : 'Failed to initiate payment'})
    }

});


app.post('/status', async (req, res) => {
    const merchantTransactionId = req.query.id;

    const keyIndex = 1
    const string = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}${MERCHANT_KEY}`;

    const sha256 = crypto.createHash('sha256').update(string).digest('hex')
    const checksum = sha256 + '###' + keyIndex

    const option = {
        method: 'GET',
        url:`${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
        headers: {
            accept : 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': MERCHANT_ID
        },
    }

    try {
        const response = await axios.request(option);
        if (response.data.success === true) {
            return res.redirect(successUrl);
        } else {
            return res.redirect(failureUrl);
        }
    } catch (error) {
        console.error(error);
        return res.redirect(failureUrl);
    }
});


app.listen(process.env.PORT || 8000, () => {
  console.log('Server is running on port 8000');
});
