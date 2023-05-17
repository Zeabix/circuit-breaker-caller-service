/**
 * This is a sample microservice to demonstrate the implementation
 * of the circuit breaker pattern
 * This circuit-breaker-caller-service provide the implementation of circuit breaker
 * when calling the circuit-breaker-upstream-service
 */

const express = require('express');
const CircuitBreaker = require('opossum');
const axios = require('axios');


const port = process.env.PORT || 3000;
const upstreamHost = process.env.UPSTREAM_HOST || 'http://localhost:3000'
const upstreamAPI = upstreamHost + '/profiles/';
const app = express();

function asyncGetProfileUpstream(id) {
    return new Promise((resolve, reject) => {
        var url = upstreamAPI + id;
        console.log(`Getting profile from upstream service at ${url}`);
        axios.get(url)
            .then(response => {
                console.log(response.data);
                resolve(response.data);
            })
            .catch(error => {
                console.log(error);
                reject(error);
            })
    });
}

// Circuit Breaker configuration
const options = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
}

const breaker = new CircuitBreaker(asyncGetProfileUpstream, options)

breaker.on('open', () => {
    console.log(`Circuit is open`);
})

breaker.on('halfOpen', () => {
    console.log(`Circuit is Half Open`);
})

breaker.on('close', () => {
    console.log(`Circuit is close`);
})


app.get('/profiles/:id', function(req, res){
    var id = req.params.id;
    console.log(`Getting profile for id: ${id}`);
    breaker.fire(id)
        .then(data => {
            res.json(data)
        })
        .catch(() => {
            console.log("Breaker is open");
            res.sendStatus(500);
        })
})



const server = app.listen(port, () => {
    console.log(`Circuit Breaker Caller service is starting at port ${port}`)
})


const gracefully = function(){
    console.log(`Gracefully shutting down the process...`)
    server.close();
    console.log(`Process is shutdown gracefully`)
}

// Register gracefully shutdown
process.on('SIGINT', gracefully);
process.on('SIGTERM', gracefully);