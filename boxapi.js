import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import Bottleneck from 'bottleneck'
import logger from './logger.js'
import config from './config.js'

/*
    Global variable definitions for the access token data; the token itself and the calcucated timestamp
    it will expire (minus 2 minutes slack).
*/
let access_token = null
let refreshTime = null

/*
    Global variable definition for the state of the token minting process.
*/
let mintingInProgress = false

/*
    The Axios object with the baseUrl set. This object is exported to code outside this script.
*/
const boxApi = axios.create({
    baseURL: config.boxDefaultBaseUrl,
})

/*
    Settings for the Bottleneck request rate limiter
*/
const limiter = new Bottleneck({
    minTime: config.requestDelay,
    maxConcurrent: config.numUploadThreads
});


/*
    This function creates a JWT and exchanges it for an access token. It is called
    by the response interceptor. This routine is used concurrently where the function is
    called at the same time multiple times. This is solved by adding a delay of 10 to 20
    miliseconds before calling the mintToken function, and also by checking if minting is not 
    already in progres. If it is, it is assumed tha the access token will be available in the
    variable within 500 miliseconds (assumed to be a reasoable time for minting).
*/
const mintToken = async () => {
    if (!mintingInProgress) {
        logger.debug("Minting new token")
        mintingInProgress = true
        const assertion = jwt.sign(
            { // The Claims
                iss: config.jwt.boxAppSettings.clientID,
                sub: config.jwt.enterpriseID,
                box_sub_type: "enterprise",
                aud: config.boxTokenUrl,
                jti: crypto.randomBytes(64).toString("hex"),
                exp: Math.floor(Date.now() / 1000) + 60
            },
            { // The Key
                key: config.jwt.boxAppSettings.appAuth.privateKey,
                passphrase: config.jwt.boxAppSettings.appAuth.passphrase
            }, 
            { // The Header
                'algorithm': 'RS512',
                'keyid': config.jwt.boxAppSettings.appAuth.publicKeyID
            }
        )

        try {
            const response = await axios.post(config.boxTokenUrl, {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: assertion,
                client_id: config.jwt.boxAppSettings.clientID,
                client_secret: config.jwt.boxAppSettings.clientSecret
            })

            const now = new Date()
            refreshTime = now.setSeconds(now.getSeconds() + (response.data.expires_in - 120))
            access_token = response.data.access_token
            
        } catch(error) {
            logger.error("Error in minting chain")
            logger.debug(error)
            
        } finally {
            mintingInProgress = false
        }
    } else {
        logger.debug("Minting is already in progress. Delaying to allow usage of token currently being minted")
        await new Promise(resolve => setTimeout(resolve, 500));
    }

}

/*
    The current access token is added to the Authorization header and the request is delayed for
    the number of miliseconds specified in the configuration to avoid exceeding rate limits. Since
    this API is used concurrently, a minimal delay is built in to allow the first thread to request
    a token which can be used by the threads started delayed.
*/
boxApi.interceptors.request.use(async request => {
    await limiter.schedule(() => {})
    if (!access_token || ((new Date()) > refreshTime)) {
        logger.debug(`No access token or access token near expiry. New access token required before executing request`)
        await new Promise(resolve => setTimeout(resolve, getRandomNumber(10,20)));
        await mintToken()
    }
    request.headers.Authorization = `Bearer ${access_token}`;
    return request;
  }, function (error) {
    logger.error(error)
  });

/*
    Via response interceptor, the status code of any API request is checked. If the 
    access token is not accepted by the endpoint, then 
    we are calling the Mint Token function to generate a new JWT and exchange is for an 
    access token, which is then used from that moment on until the above conditions
    are met. Since we're checking for existence of an access token and its expiry time,
    this function should only be called in exceptions.
*/
boxApi.interceptors.response.use(null, async (error) => {
    if (error.config && error.response && error.response.status === 401) {
        logger.debug(`Response status was 401. Starting minting to generate token and add it to header`)
        await mintToken()
        return boxApi.request(error.config);
    }
    return Promise.reject(error);
});

export default boxApi

/*
    Helper function to return a random number between min (inclusive) and max (exclusive)
 */
const getRandomNumber = (min, max) => {
    return Math.random() * (max - min) + min;
}
