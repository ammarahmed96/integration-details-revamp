export const COHORT_LIST = [
  'lcs','lung','g_lung','aaa','taa','pancreas',
  'ielcap','thyroid','liver','renal','calcium','af','breast',
] as const

export type CohortType = typeof COHORT_LIST[number]
