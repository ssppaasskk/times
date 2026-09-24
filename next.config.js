// next.config.js
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require("next/constants");

// Скрипты сами находят пути через process.cwd()
require("./scripts/parse-schedule");
require("./scripts/parse-changes");

const nextConfig = {};

module.exports = (phase) => {
    if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
        const withPWA = require("@ducanh2912/next-pwa").default({
            dest: "public",
        });
        return withPWA(nextConfig);
    }
    return nextConfig;
};