import { useState, useCallback } from "react";

interface RiskCalculation {
  riskAmount: number;
  riskPercentage: number;
  recommendedLot: number;
  potentialLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
}

interface RiskCalculatorInput {
  accountBalance: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  lotSize?: number;
  riskPercentage?: number;
  pipValue?: number; // Per lot, default varies by pair
}

export const useRiskCalculator = () => {
  const [calculation, setCalculation] = useState<RiskCalculation | null>(null);

  const calculateRisk = useCallback((input: RiskCalculatorInput): RiskCalculation => {
    const {
      accountBalance,
      entryPrice,
      stopLoss,
      takeProfit,
      lotSize,
      riskPercentage = 2, // Default 2% risk
      pipValue = 10, // Default $10 per pip for standard lot
    } = input;

    // Calculate pips to stop loss
    const pipsToSL = Math.abs(entryPrice - stopLoss);
    const pipsToTP = takeProfit ? Math.abs(takeProfit - entryPrice) : pipsToSL * 2;

    // Normalize pips (for 5-decimal pairs divide by 0.0001, for JPY pairs divide by 0.01)
    const pipMultiplier = entryPrice > 50 ? 100 : 10000; // Simple heuristic for JPY pairs
    const slPips = pipsToSL * pipMultiplier;
    const tpPips = pipsToTP * pipMultiplier;

    // Calculate risk amount based on percentage
    const riskAmount = (accountBalance * riskPercentage) / 100;

    // Calculate recommended lot size
    // Risk Amount = Pips × Pip Value × Lot Size
    // Lot Size = Risk Amount / (Pips × Pip Value)
    const recommendedLot = slPips > 0 ? riskAmount / (slPips * pipValue) : 0;

    // If lot size is provided, calculate actual risk
    const actualLot = lotSize || recommendedLot;
    const potentialLoss = slPips * pipValue * actualLot;
    const potentialProfit = tpPips * pipValue * actualLot;

    // Calculate risk/reward ratio
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;

    // Calculate actual risk percentage
    const actualRiskPercentage = (potentialLoss / accountBalance) * 100;

    const result: RiskCalculation = {
      riskAmount: Math.round(riskAmount * 100) / 100,
      riskPercentage: Math.round(actualRiskPercentage * 100) / 100,
      recommendedLot: Math.round(recommendedLot * 100) / 100,
      potentialLoss: Math.round(potentialLoss * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    };

    setCalculation(result);
    return result;
  }, []);

  const resetCalculation = useCallback(() => {
    setCalculation(null);
  }, []);

  return {
    calculation,
    calculateRisk,
    resetCalculation,
  };
};
