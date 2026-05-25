export interface SmartMoneyValidation {
  whaleConfidence: number
  perpConfirmation: boolean
  spotConfirmation: boolean
  koreaConfirmation: boolean
}

export function getSmartMoneyValidation(): SmartMoneyValidation {
  return {
    whaleConfidence: 78,
    perpConfirmation: true,
    spotConfirmation: true,
    koreaConfirmation: false,
  }
}