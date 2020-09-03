enum Regions {
  EU_CENTRAL_1 = "ca-central-1"
}

type ProjectConfig = {
  naming: {
    company: string,
    dept: string,
    project: string
  },
  deployment: {
    region: Regions
  },
  tags: {
    app: string
    dept: string
  }
}

const config: ProjectConfig = {
  "naming": {
    "company": "company",
    "dept": "dept",
    "project":  "project"
  },
  "deployment": {
    "region": Regions.EU_CENTRAL_1
  },
  "tags": {
    "app": "sample-app",
    "dept": "dept"
  }
}

export default config