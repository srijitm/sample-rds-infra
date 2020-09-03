export const secretManagerPolicyActions : string[] =[
    "secretsmanager:GetSecretValue"
]

export const ssmReadPolicyActions : string[] = [
  "ssm:Describe*",
  "ssm:Get*",
  "ssm:List*"
]

export const taskPolicyActions : string[] = [
  ...secretManagerPolicyActions,
  ...ssmReadPolicyActions
]