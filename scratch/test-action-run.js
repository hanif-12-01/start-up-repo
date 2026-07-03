"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextAuth = require("next-auth");
try {
    Object.defineProperty(nextAuth, "getServerSession", {
        value: async (options) => {
            console.log("Mocked getServerSession called");
            return {
                user: {
                    id: "5a4e4e39-7ac6-48fe-a4cc-26a6823abed8",
                    email: "owner@wattwise.id",
                    name: "Budi Santoso",
                    hasBusiness: true,
                },
            };
        },
        configurable: true,
        writable: true
    });
}
catch (e) {
    console.log("Object.defineProperty failed, trying another way");
}
const business_1 = require("../src/app/actions/business");
const client_1 = require("@prisma/client");
async function main() {
    console.log("Calling createOnboardingBusiness server action...");
    const res = await (0, business_1.createOnboardingBusiness)({
        name: "Test Laundry Ke-4",
        type: client_1.BusinessType.LAUNDRY,
        address: "Jl. Baru No. 99",
        powerVA: 2200,
        operatingHours: "08:00 - 20:00",
        appliances: [
            {
                name: "Mesin Cuci Baru",
                powerWatt: 400,
                quantity: 1,
                dailyUsageHours: 6,
            },
        ],
    });
    console.log("Result:", res);
}
main()
    .catch(console.error);
