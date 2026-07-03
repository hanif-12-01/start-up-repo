export type ApplianceEstimateInput = {
  powerWatt: number;
  quantity: number;
  dailyUsageHours: number;
};

export function estimateMonthlyKwh(appliance: ApplianceEstimateInput) {
  return (appliance.powerWatt * appliance.quantity * appliance.dailyUsageHours * 30) / 1000;
}

export function estimateMonthlyCost(appliance: ApplianceEstimateInput, tariffPerKwh: number) {
  return estimateMonthlyKwh(appliance) * tariffPerKwh;
}