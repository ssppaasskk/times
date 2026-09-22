const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
} = require("next/constants");

const path = require("path");
const fs = require("fs");
const {parseString} = require("xml2js");

/** @type {import('next').NextConfig} */

function createDataJsonFile(readName, writeName) {
    const getDataPath = (filename) => path.join(process.cwd(), 'src', 'shared', 'lib', 'data', filename);
    const getXMLPath = (filename) => path.join(process.cwd(), 'public', filename);
    const xmlData = fs.readFileSync(getXMLPath(readName), 'utf-8');
    parseString(xmlData, function (err, results) {
        if (err) {
            return null;
        } else {
            fs.writeFileSync(getDataPath(writeName), JSON.stringify(results), 'utf-8');
        }
    });
}                                                                                       

const nextConfig = {};
let start = true;
module.exports = (phase) => {
    if (start) {
        createDataJsonFile("rs.xml", '../data/data.json');
        createDataJsonFile("rs202554.xml", '../data/even_data.json');
        createDataJsonFile("rs202553.xml", '../data/odd_data.json');
        start = false;
    }
    if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
        const withPWA = require("@ducanh2912/next-pwa").default({
            dest: "public",
        });
        return withPWA(nextConfig);
    }
    return nextConfig;
}
